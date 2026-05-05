//! Delta free-space monitor + Library subtree differential scan for System Storage Analyzer.
use std::collections::{HashMap, VecDeque};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

use crate::path_taxonomy::{assess_risk, calculate_dir_size, classify_node, NodeType, RiskLevel};

use super::common::{home_dir, format_space, TrashErrorDto, TrashResultDto};
use super::trash::delete_to_trash;
use super::uninstaller::list_uninstall_apps;

const SURGE_THRESHOLD_BYTES: u64 = 500 * 1024 * 1024;
const SURGE_WINDOW_MIN: Duration = Duration::from_secs(45);
const SURGE_WINDOW_MAX: Duration = Duration::from_secs(120);
const EMIT_COOLDOWN: Duration = Duration::from_secs(300);
const MIN_DELTA_BYTES: u64 = 1024 * 1024; // 1 MB — smaller bumps still show after the second scan
const LARGE_FILE_BYTES: u64 = 100 * 1024 * 1024;
const LARGE_FILE_AGE_SECS: i64 = 300;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskSurgeDetectedPayload {
    pub delta_bytes: u64,
    pub window_sec: u64,
    pub free_bytes_now: u64,
}

#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SurgeFileItemDto {
    pub app_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bundle_id: Option<String>,
    pub path: String,
    pub display_name: String,
    pub size_bytes: u64,
    pub delta_bytes: u64,
    pub node_type: String,
    pub risk_level: String,
    pub category_key: String,
}

#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StorageCategoryDto {
    pub category_key: String,
    pub risk_level: String,
    pub size_bytes: u64,
    pub items: Vec<SurgeFileItemDto>,
}

#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppStorageImpactDto {
    pub app_name: String,
    pub bundle_id: Option<String>,
    pub total_bytes: u64,
    pub categories: Vec<StorageCategoryDto>,
}

#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SurgeReportDto {
    pub total_delta_bytes: u64,
    pub fda_limited: bool,
    /// Largest Library child folders by current size (always filled so the first run is useful).
    pub snapshot_top: Vec<SurgeFileItemDto>,
    pub detected_apps: Vec<AppStorageImpactDto>,
    pub large_recent_files: Vec<SurgeFileItemDto>,
    /** First successful scan only stores sizes for delta comparison; run again for growth. */
    pub baseline_established: bool,
}

#[derive(Default)]
struct DiskSurgeInner {
    samples: VecDeque<(Instant, u64)>,
    prev_child_sizes: HashMap<String, u64>,
    last_emit: Option<Instant>,
}

#[derive(Clone)]
pub struct DiskSurgeState(Arc<Mutex<DiskSurgeInner>>);

impl Default for DiskSurgeState {
    fn default() -> Self {
        Self(Arc::new(Mutex::new(DiskSurgeInner::default())))
    }
}

fn bundle_map_from_apps() -> HashMap<String, String> {
    match list_uninstall_apps() {
        Ok(apps) => apps
            .into_iter()
            .filter(|a| !a.bundle_id.is_empty())
            .map(|a| (a.bundle_id, a.name))
            .collect(),
        Err(e) => {
            log::warn!("disk_surge: list_uninstall_apps failed (using heuristics only): {e}");
            HashMap::new()
        }
    }
}

fn build_snapshot_top(
    current: &HashMap<String, u64>,
    bundle_to_name: &HashMap<String, String>,
    limit: usize,
) -> Vec<SurgeFileItemDto> {
    let mut pairs: Vec<(&String, &u64)> = current.iter().collect();
    pairs.sort_by(|a, b| b.1.cmp(a.1));
    pairs
        .into_iter()
        .take(limit)
        .map(|(path_s, sz)| {
            let path = PathBuf::from(path_s);
            let nt = classify_node(&path);
            let risk = assess_risk(&nt);
            let (app_name, bundle_id) = infer_app(&path, bundle_to_name);
            let name = path
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| path.to_string_lossy().to_string());
            SurgeFileItemDto {
                app_name: app_name.clone(),
                bundle_id: bundle_id.clone(),
                path: path.to_string_lossy().to_string(),
                display_name: format!("{app_name} — {name}"),
                size_bytes: *sz,
                delta_bytes: 0,
                node_type: format!("{nt:?}"),
                risk_level: format!("{risk:?}"),
                category_key: category_key_for(&nt, &path).to_string(),
            }
        })
        .collect()
}

impl DiskSurgeState {
    pub fn record_sample_and_maybe_surge(&self, free: u64) -> Option<u64> {
        let now = Instant::now();
        let mut inner = self.0.lock().ok()?;
        inner.samples.push_back((now, free));
        while let Some(front) = inner.samples.front() {
            if now.duration_since(front.0) > SURGE_WINDOW_MAX {
                inner.samples.pop_front();
            } else {
                break;
            }
        }
        let oldest = inner.samples.front()?;
        if now.duration_since(oldest.0) < SURGE_WINDOW_MIN {
            return None;
        }
        let max_free = inner.samples.iter().map(|(_, f)| *f).max().unwrap_or(free);
        let consumed = max_free.saturating_sub(free);
        if consumed < SURGE_THRESHOLD_BYTES {
            return None;
        }
        if let Some(le) = inner.last_emit {
            if now.duration_since(le) < EMIT_COOLDOWN {
                return None;
            }
        }
        inner.last_emit = Some(now);
        Some(consumed)
    }

    pub fn analyze(&self) -> Result<SurgeReportDto, String> {
        let home = home_dir()?;
        let fda_limited = !super::disk_explorer::check_full_disk_access();

        let bundle_to_name = bundle_map_from_apps();

        let roots = [
            home.join("Library/Caches"),
            home.join("Library/Containers"),
            home.join("Library/Application Support"),
        ];

        let mut current: HashMap<String, u64> = HashMap::new();
        for root in &roots {
            if !root.is_dir() {
                continue;
            }
            let read = std::fs::read_dir(root).map_err(|e| e.to_string())?;
            for e in read.flatten() {
                let p = e.path();
                if !p.is_dir() {
                    continue;
                }
                let key = p.to_string_lossy().to_string();
                let (sz, _) = calculate_dir_size(&p);
                current.insert(key, sz);
            }
        }

        let prev_snapshot = {
            let inner = self.0.lock().map_err(|_| "lock poisoned".to_string())?;
            inner.prev_child_sizes.clone()
        };
        let is_baseline = prev_snapshot.is_empty();
        let snapshot_top = build_snapshot_top(&current, &bundle_to_name, 50);

        let mut deltas: Vec<(PathBuf, u64, u64)> = Vec::new();
        if !is_baseline {
            for (path_s, &now_sz) in &current {
                let pb = PathBuf::from(path_s);
                let prev_sz = prev_snapshot.get(path_s).copied().unwrap_or(0);
                let d = now_sz.saturating_sub(prev_sz);
                if d >= MIN_DELTA_BYTES {
                    deltas.push((pb, d, now_sz));
                }
            }
            deltas.sort_by(|a, b| b.1.cmp(&a.1));
        }

        if let Ok(mut inner) = self.0.lock() {
            inner.prev_child_sizes = current;
        }

        let top_for_large: Vec<(PathBuf, u64, u64)> = snapshot_top
            .iter()
            .take(5)
            .map(|it| (PathBuf::from(&it.path), 0u64, it.size_bytes))
            .collect();
        let large_recent = collect_large_recent(&top_for_large, &bundle_to_name, LARGE_FILE_BYTES, LARGE_FILE_AGE_SECS)?;

        if is_baseline {
            return Ok(SurgeReportDto {
                total_delta_bytes: 0,
                fda_limited,
                snapshot_top,
                detected_apps: vec![],
                large_recent_files: large_recent,
                baseline_established: true,
            });
        }

        let total_delta: u64 = deltas.iter().map(|(_, d, _)| *d).sum();

        let mut raw_items: Vec<SurgeFileItemDto> = Vec::new();
        for (path, delta, cur_sz) in deltas.iter().take(80) {
            let nt = classify_node(path);
            let risk = assess_risk(&nt);
            let (app_name, bundle_id) = infer_app(path, &bundle_to_name);
            let category_key = category_key_for(&nt, path);
            let name = path
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| path.to_string_lossy().to_string());
            raw_items.push(SurgeFileItemDto {
                app_name: app_name.clone(),
                bundle_id: bundle_id.clone(),
                path: path.to_string_lossy().to_string(),
                display_name: format!("{app_name} — {name}"),
                size_bytes: *cur_sz,
                delta_bytes: *delta,
                node_type: format!("{nt:?}"),
                risk_level: format!("{risk:?}"),
                category_key: category_key.to_string(),
            });
        }

        let large_recent_growth = collect_large_recent(&deltas, &bundle_to_name, LARGE_FILE_BYTES, LARGE_FILE_AGE_SECS)?;
        let large_recent_files = if large_recent_growth.is_empty() {
            large_recent
        } else {
            large_recent_growth
        };

        let detected_apps = group_by_app(raw_items);

        Ok(SurgeReportDto {
            total_delta_bytes: total_delta,
            fda_limited,
            snapshot_top,
            detected_apps,
            large_recent_files,
            baseline_established: false,
        })
    }
}

fn category_key_for(nt: &NodeType, path: &Path) -> &'static str {
    let s = path.to_string_lossy().to_lowercase();
    match nt {
        NodeType::Cache | NodeType::Log | NodeType::Trash => "runtime_cache",
        NodeType::Developer => "developer",
        NodeType::Backup => "backup",
        NodeType::UserData => "user_project",
        NodeType::Media => "user_media",
        NodeType::Downloads => "downloads",
        NodeType::AppSupport => {
            if s.contains("backup") || s.contains(".bak") {
                "backup"
            } else {
                "working"
            }
        }
        NodeType::Application => "application",
        NodeType::System => "system",
        NodeType::Other => {
            if s.contains("/containers/") {
                "working"
            } else {
                "other"
            }
        }
    }
}

fn bundle_from_containers_path(path: &Path) -> Option<String> {
    let s = path.to_string_lossy();
    let needle = "/Library/Containers/";
    let i = s.find(needle)?;
    let rest = &s[i + needle.len()..];
    let bid = rest.split('/').next()?.trim();
    if bid.is_empty() {
        return None;
    }
    Some(bid.to_string())
}

fn infer_app(path: &Path, bundle_to_name: &HashMap<String, String>) -> (String, Option<String>) {
    let s = path.to_string_lossy().to_lowercase();

    if let Some(bid) = bundle_from_containers_path(path) {
        if let Some(n) = bundle_to_name.get(&bid) {
            return (n.clone(), Some(bid));
        }
        return (humanize_bundle_id(&bid), Some(bid));
    }

    if s.contains("/library/caches/") {
        if let Some(seg) = path.file_name().and_then(|x| x.to_str()) {
            if seg.starts_with("com.") {
                if let Some(n) = bundle_to_name.get(seg) {
                    return (n.clone(), Some(seg.to_string()));
                }
                return (humanize_bundle_id(seg), Some(seg.to_string()));
            }
        }
    }

    if s.contains("/application support/") {
        if s.contains("affinity") {
            return ("Affinity".to_string(), None);
        }
        if s.contains("adobe") {
            return ("Adobe".to_string(), None);
        }
        if s.contains("serif") {
            return ("Serif / Affinity".to_string(), None);
        }
        if let Some(parent) = path.parent().and_then(|p| p.file_name()).and_then(|x| x.to_str()) {
            if parent == "Application Support" {
                if let Some(name) = path.file_name().and_then(|x| x.to_str()) {
                    if name.starts_with("com.") {
                        if let Some(n) = bundle_to_name.get(name) {
                            return (n.clone(), Some(name.to_string()));
                        }
                        return (humanize_bundle_id(name), Some(name.to_string()));
                    }
                    return (name.to_string(), None);
                }
            }
        }
    }

    (
        path.file_name()
            .map(|x| x.to_string_lossy().to_string())
            .unwrap_or_else(|| "Unknown".to_string()),
        None,
    )
}

fn humanize_bundle_id(bid: &str) -> String {
    let tail = bid.rsplit('.').next().unwrap_or(bid);
    let t = tail.replace(['_', '-'], " ");
    Some(t)
        .filter(|s| !s.is_empty())
        .map(|s| {
            let mut c = s.chars();
            match c.next() {
                None => bid.to_string(),
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
            }
        })
        .unwrap_or_else(|| bid.to_string())
}

fn group_by_app(items: Vec<SurgeFileItemDto>) -> Vec<AppStorageImpactDto> {
    use std::collections::BTreeMap;

    #[derive(Default)]
    struct Agg {
        bundle_id: Option<String>,
        categories: BTreeMap<String, StorageCategoryDto>,
        total: u64,
    }
    let mut by_app: HashMap<String, Agg> = HashMap::new();

    for it in items {
        let app_key = it.app_name.clone();
        let entry = by_app.entry(app_key.clone()).or_default();
        entry.total = entry.total.saturating_add(it.delta_bytes);
        if entry.bundle_id.is_none() {
            if let Some(ref b) = it.bundle_id {
                entry.bundle_id = Some(b.clone());
            } else if let Some(b) = bundle_from_containers_path(Path::new(&it.path)) {
                entry.bundle_id = Some(b);
            }
        }
        let ck = it.category_key.clone();
        let cat = entry.categories.entry(ck.clone()).or_insert_with(|| StorageCategoryDto {
            category_key: ck,
            risk_level: it.risk_level.clone(),
            size_bytes: 0,
            items: vec![],
        });
        cat.size_bytes = cat.size_bytes.saturating_add(it.delta_bytes);
        cat.items.push(it);
    }

    let mut out: Vec<AppStorageImpactDto> = by_app
        .into_iter()
        .map(|(app_name, agg)| {
            let cats: Vec<StorageCategoryDto> = agg.categories.into_values().collect();
            AppStorageImpactDto {
                bundle_id: agg.bundle_id,
                total_bytes: agg.total,
                categories: cats,
                app_name,
            }
        })
        .collect();
    out.sort_by(|a, b| b.total_bytes.cmp(&a.total_bytes));
    out
}

fn collect_large_recent(
    deltas: &[(PathBuf, u64, u64)],
    bundle_to_name: &HashMap<String, String>,
    min_bytes: u64,
    max_age_secs: i64,
) -> Result<Vec<SurgeFileItemDto>, String> {
    use std::time::SystemTime;
    use walkdir::WalkDir;

    let now = SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs() as i64;

    let mut out: Vec<SurgeFileItemDto> = Vec::new();
    for (root, _, _) in deltas.iter().take(5) {
        for e in WalkDir::new(root).follow_links(false).max_depth(8).into_iter().filter_map(|x| x.ok()) {
            if !e.file_type().is_file() {
                continue;
            }
            let meta = match e.metadata() {
                Ok(m) => m,
                Err(_) => continue,
            };
            let len = meta.len();
            if len < min_bytes {
                continue;
            }
            let modified = meta.modified().ok().and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok());
            let Some(mdur) = modified else { continue };
            let msec = mdur.as_secs() as i64;
            if now - msec > max_age_secs {
                continue;
            }
            let p = e.path().to_path_buf();
            let nt = classify_node(&p);
            let risk = assess_risk(&nt);
            let (app_name, bundle_id) = infer_app(&p, bundle_to_name);
            let name = p.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
            let category_key = category_key_for(&nt, &p).to_string();
            out.push(SurgeFileItemDto {
                app_name: app_name.clone(),
                bundle_id: bundle_id.clone(),
                path: p.to_string_lossy().to_string(),
                display_name: format!("{app_name} — {name}"),
                size_bytes: len,
                delta_bytes: 0,
                node_type: format!("{nt:?}"),
                risk_level: format!("{risk:?}"),
                category_key,
            });
            if out.len() >= 25 {
                return Ok(out);
            }
        }
    }
    Ok(out)
}

fn home_volume_free_bytes() -> Result<u64, String> {
    let home = home_dir()?;
    let home_s = home.to_string_lossy().to_string();
    let disks = sysinfo::Disks::new_with_refreshed_list();
    let mut best_free: u64 = 0;
    let mut best_mount_len = 0usize;
    for disk in disks.list() {
        let mount = disk.mount_point().to_string_lossy().to_string();
        if home_s.starts_with(&mount) && mount.len() >= best_mount_len {
            best_free = disk.available_space();
            best_mount_len = mount.len();
        }
    }
    Ok(best_free)
}

pub fn spawn_disk_surge_monitor(app: AppHandle, state: DiskSurgeState) {
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(30));
        loop {
            interval.tick().await;
            let free = match home_volume_free_bytes() {
                Ok(v) => v,
                Err(_) => continue,
            };
            if let Some(delta) = state.record_sample_and_maybe_surge(free) {
                let payload = DiskSurgeDetectedPayload {
                    delta_bytes: delta,
                    window_sec: 60,
                    free_bytes_now: free,
                };
                if let Err(e) = app.emit("disk_surge_detected", &payload) {
                    log::warn!("disk_surge: emit disk_surge_detected failed: {e}");
                }
            }
        }
    });
}

#[tauri::command]
pub async fn analyze_disk_surge(state: State<'_, DiskSurgeState>) -> Result<SurgeReportDto, String> {
    let st = state.inner().clone();
    tokio::task::spawn_blocking(move || st.analyze())
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn surge_trash_safe_cache_paths(paths: Vec<String>) -> Result<TrashResultDto, String> {
    let home = home_dir()?;
    let caches_root = home.join("Library/Caches");
    let Ok(caches_canon) = std::fs::canonicalize(&caches_root) else {
        return Err("Cannot resolve ~/Library/Caches".into());
    };

    let mut freed: u64 = 0;
    let mut succeeded = Vec::new();
    let mut failed = Vec::new();

    for p in paths {
        let path = PathBuf::from(&p);
        let Ok(canon) = std::fs::canonicalize(&path) else {
            failed.push(TrashErrorDto {
                path: p.clone(),
                message: "Cannot resolve path".into(),
            });
            continue;
        };
        if !canon.starts_with(&caches_canon) {
            failed.push(TrashErrorDto {
                path: p.clone(),
                message: "Only items under ~/Library/Caches can be removed with this action".into(),
            });
            continue;
        }
        let nt = classify_node(&path);
        if !matches!(nt, NodeType::Cache) {
            failed.push(TrashErrorDto {
                path: p.clone(),
                message: "Path is not classified as cache".into(),
            });
            continue;
        }
        if !matches!(assess_risk(&nt), RiskLevel::Safe) {
            failed.push(TrashErrorDto {
                path: p.clone(),
                message: "Risk level is not Safe".into(),
            });
            continue;
        }
        let size = crate::path_taxonomy::calculate_dir_size(&path).0;
        match delete_to_trash(&path) {
            Ok(()) => {
                freed = freed.saturating_add(size);
                succeeded.push(p);
            }
            Err(e) => failed.push(TrashErrorDto { path: p, message: e }),
        }
    }

    Ok(TrashResultDto {
        freed_label: format_space(freed),
        freed_bytes: freed,
        succeeded,
        failed,
    })
}
