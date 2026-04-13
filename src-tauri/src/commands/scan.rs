use super::common::*;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};
use walkdir::WalkDir;

const MAX_FILES: usize = 500_000;
const LARGE_BYTES: u64 = 100 * 1024 * 1024;

static CANCEL_FLAG: AtomicBool = AtomicBool::new(false);

fn is_cache_path(p: &str) -> bool {
    p.contains("/Library/Caches/")
}

fn is_backup_path(p: &str) -> bool {
    let lower = p.to_lowercase();
    lower.contains("mobilesync")
        || lower.contains("backup")
        || lower.ends_with(".ipsw")
        || lower.contains("time machine")
        || lower.contains("timemachine")
}

fn is_developer_path(p: &str) -> bool {
    let lower = p.to_lowercase();
    lower.contains("/deriveddata/")
        || lower.contains("/node_modules/")
        || lower.contains("/.gradle/")
        || lower.contains("/__pycache__/")
        || lower.contains("/pods/")
        || lower.contains("/.build/")
        || lower.contains("/target/debug/")
        || lower.contains("/target/release/")
        || lower.contains("/.cargo/registry/")
        || lower.contains("/vendor/bundle/")
}

fn is_log_path(p: &str) -> bool {
    let lower = p.to_lowercase();
    lower.contains("/library/logs/") || lower.ends_with(".log")
}

fn cache_group_key(home: &Path, path: &Path) -> Option<String> {
    let caches = home.join("Library/Caches");
    let rel = path.strip_prefix(&caches).ok()?;
    rel.components()
        .next()
        .map(|c| c.as_os_str().to_string_lossy().to_string())
}

fn short_path_label(path: &Path) -> String {
    let s = path.to_string_lossy();
    if s.len() <= 96 {
        return s.to_string();
    }
    format!("…{}", &s[s.len().saturating_sub(93)..])
}

fn collect_records(home: &Path, app: &AppHandle) -> Result<Vec<FileRecord>, String> {
    CANCEL_FLAG.store(false, Ordering::SeqCst);

    let roots: Vec<(PathBuf, usize)> = vec![
        (home.join("Library/Caches"), 12),
        (home.join("Downloads"), 10),
        (home.join("Desktop"), 10),
        (home.join("Documents"), 10),
        (home.join("Movies"), 8),
        (home.join("Music"), 8),
        (home.join("Pictures"), 10),
        (home.join("Library/Mobile Documents"), 8),
        (home.join("Library/Application Support"), 10),
        (home.join("Library/Logs"), 8),
        (home.join("Library/Containers"), 8),
        (home.join("Library/Mail"), 8),
        (home.join("Library/Developer"), 10),
        (home.join("Library/Saved Application State"), 6),
    ];

    let total_roots = roots.len();
    let root_span = if total_roots == 0 {
        0.0
    } else {
        85.0 / total_roots as f64
    };
    let mut records = Vec::new();
    let mut count = 0usize;

    for (idx, (root, max_depth)) in roots.iter().enumerate() {
        if CANCEL_FLAG.load(Ordering::SeqCst) {
            return Err("Scan cancelled".to_string());
        }
        if !root.exists() {
            continue;
        }

        let stage = root
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "unknown".to_string());

        let _ = app.emit(
            "scan_progress",
            ScanProgressPayload {
                stage: format!("Scanning {}...", stage),
                phase: "walk".to_string(),
                pct: idx as f64 * root_span,
                files_found: count,
                items_flagged: 0,
                current_path: None,
            },
        );

        let mut files_in_root = 0usize;

        for entry in WalkDir::new(root)
            .follow_links(false)
            .max_depth(*max_depth)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if CANCEL_FLAG.load(Ordering::SeqCst) {
                return Err("Scan cancelled".to_string());
            }
            if count >= MAX_FILES {
                break;
            }
            let meta = match entry.metadata() {
                Ok(m) => m,
                Err(_) => continue,
            };
            if !meta.is_file() {
                continue;
            }

            records.push(FileRecord {
                path: entry.path().to_path_buf(),
                size: meta.len(),
                modified_ms: modified_ms(&meta),
            });
            count += 1;
            files_in_root += 1;

            let base_pct = idx as f64 * root_span;
            let sub = (files_in_root.min(50_000) as f64 / 50_000.0) * root_span * 0.95;
            let pct = (base_pct + sub).min(84.5_f64);

            if count % 2000 == 0 {
                let _ = app.emit(
                    "scan_progress",
                    ScanProgressPayload {
                        stage: format!("Scanning {}...", stage),
                        phase: "walk".to_string(),
                        pct,
                        files_found: count,
                        items_flagged: 0,
                        current_path: Some(short_path_label(entry.path())),
                    },
                );
            }
        }
        if count >= MAX_FILES {
            break;
        }
    }

    Ok(records)
}

#[tauri::command]
pub fn cancel_scan() {
    CANCEL_FLAG.store(true, Ordering::SeqCst);
}

#[tauri::command]
pub async fn deep_scan(app: AppHandle) -> Result<Vec<ScanResultDto>, String> {
    tokio::task::spawn_blocking(move || deep_scan_sync(app))
        .await
        .map_err(|e| format!("Scan join error: {e}"))?
}

fn deep_scan_sync(app: AppHandle) -> Result<Vec<ScanResultDto>, String> {
    let home = home_dir()?;
    let records = collect_records(&home, &app)?;
    let now_ms = chrono::Utc::now().timestamp_millis();
    let thirty_days = 30_i64 * 24 * 3600 * 1000;

    let _ = app.emit(
        "scan_progress",
        ScanProgressPayload {
            stage: "Analyzing files...".to_string(),
            phase: "analyze".to_string(),
            pct: 90.0,
            files_found: records.len(),
            items_flagged: 0,
            current_path: None,
        },
    );

    // --- Cache aggregates ---
    let mut cache_groups: HashMap<String, u64> = HashMap::new();
    let mut cache_mtime: HashMap<String, i64> = HashMap::new();
    for r in &records {
        let p = r.path.to_string_lossy();
        if !is_cache_path(&p) {
            continue;
        }
        if let Some(key) = cache_group_key(&home, &r.path) {
            *cache_groups.entry(key.clone()).or_insert(0) += r.size;
            cache_mtime
                .entry(key)
                .and_modify(|m| *m = (*m).max(r.modified_ms))
                .or_insert(r.modified_ms);
        }
    }
    let mut cache_items: Vec<FileItemDto> = cache_groups
        .into_iter()
        .map(|(name, size)| {
            let mtime = *cache_mtime.get(&name).unwrap_or(&0);
            let synthetic = home.join("Library/Caches").join(&name);
            FileItemDto {
                id: format!("cache-{}", path_id(&synthetic)),
                name: format!("{name} (cache)"),
                path: synthetic.to_string_lossy().to_string(),
                size,
                last_accessed: iso8601(mtime),
                is_duplicate: false,
                ai_safety_score: 0.96,
                category: "cache".to_string(),
                recommended: true,
                reason: Some("Application cache; rebuilt on next launch".to_string()),
                file_type: Some("cache".to_string()),
                root_folder: Some("Library".to_string()),
            }
        })
        .collect();
    cache_items.sort_by(|a, b| b.size.cmp(&a.size));
    cache_items.truncate(60);

    // --- Duplicates ---
    let mut by_size: HashMap<u64, Vec<&FileRecord>> = HashMap::new();
    for r in &records {
        if r.size < 256 * 1024 {
            continue;
        }
        let p = r.path.to_string_lossy();
        if is_cache_path(&p) || is_log_path(&p) {
            continue;
        }
        by_size.entry(r.size).or_default().push(r);
    }

    let mut duplicate_items: Vec<FileItemDto> = Vec::new();
    for group in by_size.values() {
        if group.len() < 2 {
            continue;
        }
        let mut hashed: HashMap<Vec<u8>, Vec<&FileRecord>> = HashMap::new();
        for rec in group {
            let h = match partial_file_hash(&rec.path) {
                Ok(h) => h,
                Err(_) => continue,
            };
            hashed.entry(h).or_default().push(rec);
        }
        for dup_group in hashed.values() {
            if dup_group.len() < 2 {
                continue;
            }
            let mut sorted: Vec<&FileRecord> = dup_group.clone();
            sorted.sort_by_key(|r| std::cmp::Reverse(r.modified_ms));
            for (i, rec) in sorted.iter().enumerate() {
                let recommended = i > 0;
                let ext = file_extension(&rec.path);
                duplicate_items.push(FileItemDto {
                    id: path_id(&rec.path),
                    name: rec.path.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default(),
                    path: rec.path.to_string_lossy().to_string(),
                    size: rec.size,
                    last_accessed: iso8601(rec.modified_ms),
                    is_duplicate: true,
                    ai_safety_score: if recommended { 0.92 } else { 0.35 },
                    category: "duplicates".to_string(),
                    recommended,
                    reason: if recommended {
                        Some("Older duplicate".to_string())
                    } else {
                        Some("Newest copy — kept".to_string())
                    },
                    file_type: Some(classify_extension(&ext).to_string()),
                    root_folder: Some(root_folder_label(&home, &rec.path)),
                });
            }
        }
    }

    // --- Large files ---
    let mut large_items: Vec<FileItemDto> = records
        .iter()
        .filter(|r| {
            r.size >= LARGE_BYTES && {
                let p = r.path.to_string_lossy();
                !is_cache_path(&p) && !is_developer_path(&p)
            }
        })
        .map(|r| {
            let ext = file_extension(&r.path);
            FileItemDto {
                id: path_id(&r.path),
                name: r.path.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default(),
                path: r.path.to_string_lossy().to_string(),
                size: r.size,
                last_accessed: iso8601(r.modified_ms),
                is_duplicate: false,
                ai_safety_score: 0.78,
                category: "large_files".to_string(),
                recommended: r.modified_ms < now_ms - thirty_days,
                reason: Some("Large file; confirm before removing".to_string()),
                file_type: Some(classify_extension(&ext).to_string()),
                root_folder: Some(root_folder_label(&home, &r.path)),
            }
        })
        .collect();
    large_items.sort_by(|a, b| b.size.cmp(&a.size));
    large_items.truncate(50);

    // --- Backups ---
    let mut backup_items: Vec<FileItemDto> = records
        .iter()
        .filter(|r| is_backup_path(&r.path.to_string_lossy()))
        .map(|r| {
            let ext = file_extension(&r.path);
            FileItemDto {
                id: path_id(&r.path),
                name: r.path.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default(),
                path: r.path.to_string_lossy().to_string(),
                size: r.size,
                last_accessed: iso8601(r.modified_ms),
                is_duplicate: false,
                ai_safety_score: 0.72,
                category: "backups".to_string(),
                recommended: false,
                reason: Some("Backup-related; review before deleting".to_string()),
                file_type: Some(classify_extension(&ext).to_string()),
                root_folder: Some(root_folder_label(&home, &r.path)),
            }
        })
        .collect();
    backup_items.sort_by(|a, b| b.size.cmp(&a.size));
    backup_items.truncate(30);

    // --- Developer artifacts ---
    let mut dev_items: Vec<FileItemDto> = records
        .iter()
        .filter(|r| is_developer_path(&r.path.to_string_lossy()))
        .map(|r| {
            let ext = file_extension(&r.path);
            FileItemDto {
                id: path_id(&r.path),
                name: r.path.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default(),
                path: r.path.to_string_lossy().to_string(),
                size: r.size,
                last_accessed: iso8601(r.modified_ms),
                is_duplicate: false,
                ai_safety_score: 0.80,
                category: "developer".to_string(),
                recommended: r.modified_ms < now_ms - thirty_days,
                reason: Some("Build artifact or dependency cache".to_string()),
                file_type: Some(classify_extension(&ext).to_string()),
                root_folder: Some(root_folder_label(&home, &r.path)),
            }
        })
        .collect();
    dev_items.sort_by(|a, b| b.size.cmp(&a.size));
    dev_items.truncate(40);

    // --- Logs ---
    let mut log_items: Vec<FileItemDto> = records
        .iter()
        .filter(|r| is_log_path(&r.path.to_string_lossy()) && r.size > 1024 * 1024)
        .map(|r| FileItemDto {
            id: path_id(&r.path),
            name: r.path.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default(),
            path: r.path.to_string_lossy().to_string(),
            size: r.size,
            last_accessed: iso8601(r.modified_ms),
            is_duplicate: false,
            ai_safety_score: 0.94,
            category: "logs".to_string(),
            recommended: true,
            reason: Some("Log file; usually safe to remove".to_string()),
            file_type: Some("code".to_string()),
            root_folder: Some("Library".to_string()),
        })
        .collect();
    log_items.sort_by(|a, b| b.size.cmp(&a.size));
    log_items.truncate(30);

    // --- Old Downloads (>30 days) ---
    let downloads = home.join("Downloads");
    let mut old_dl_items: Vec<FileItemDto> = records
        .iter()
        .filter(|r| {
            r.path.starts_with(&downloads)
                && r.modified_ms < now_ms - thirty_days
                && r.size > 512 * 1024
                && !is_backup_path(&r.path.to_string_lossy())
        })
        .map(|r| {
            let ext = file_extension(&r.path);
            FileItemDto {
                id: path_id(&r.path),
                name: r.path.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default(),
                path: r.path.to_string_lossy().to_string(),
                size: r.size,
                last_accessed: iso8601(r.modified_ms),
                is_duplicate: false,
                ai_safety_score: 0.85,
                category: "downloads_old".to_string(),
                recommended: true,
                reason: Some("Not modified in over 30 days".to_string()),
                file_type: Some(classify_extension(&ext).to_string()),
                root_folder: Some("Downloads".to_string()),
            }
        })
        .collect();
    old_dl_items.sort_by(|a, b| b.size.cmp(&a.size));
    old_dl_items.truncate(50);

    // --- Mail attachments ---
    let mail_dir = home.join("Library/Mail");
    let mut mail_items: Vec<FileItemDto> = records
        .iter()
        .filter(|r| r.path.starts_with(&mail_dir) && r.size > 5 * 1024 * 1024)
        .map(|r| {
            let ext = file_extension(&r.path);
            FileItemDto {
                id: path_id(&r.path),
                name: r.path.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default(),
                path: r.path.to_string_lossy().to_string(),
                size: r.size,
                last_accessed: iso8601(r.modified_ms),
                is_duplicate: false,
                ai_safety_score: 0.70,
                category: "mail_attachments".to_string(),
                recommended: false,
                reason: Some("Large mail attachment".to_string()),
                file_type: Some(classify_extension(&ext).to_string()),
                root_folder: Some("Mail".to_string()),
            }
        })
        .collect();
    mail_items.sort_by(|a, b| b.size.cmp(&a.size));
    mail_items.truncate(20);

    let total_flagged = cache_items.len()
        + duplicate_items.len()
        + large_items.len()
        + backup_items.len()
        + dev_items.len()
        + log_items.len()
        + old_dl_items.len()
        + mail_items.len();

    let _ = app.emit(
        "scan_progress",
        ScanProgressPayload {
            stage: "Finalizing...".to_string(),
            phase: "finalize".to_string(),
            pct: 100.0,
            files_found: records.len(),
            items_flagged: total_flagged,
            current_path: None,
        },
    );

    let mut out: Vec<ScanResultDto> = Vec::new();

    if let Some(r) = build_category("cache", cache_items, "safe", "Caches are rebuilt automatically by apps.", 0.97) { out.push(r); }
    if let Some(r) = build_category("duplicates", duplicate_items, "safe", "Duplicate files sharing identical content prefix. Older copies can usually be removed.", 0.93) { out.push(r); }
    if let Some(r) = build_category("downloads_old", old_dl_items, "safe", "Downloads not modified in over 30 days.", 0.88) { out.push(r); }
    if let Some(r) = build_category("developer", dev_items, "caution", "Build artifacts, dependency caches and derived data from developer tools.", 0.82) { out.push(r); }
    if let Some(r) = build_category("large_files", large_items, "caution", "Large files: confirm you no longer need them.", 0.84) { out.push(r); }
    if let Some(r) = build_category("logs", log_items, "safe", "System and application log files (> 1 MB each).", 0.95) { out.push(r); }
    if let Some(r) = build_category("backups", backup_items, "caution", "Backup-related files; verify before deletion.", 0.74) { out.push(r); }
    if let Some(r) = build_category("mail_attachments", mail_items, "caution", "Large mail attachments (> 5 MB). Removing may affect mail history.", 0.68) { out.push(r); }

    if out.is_empty() {
        return Err("No items found. Grant Full Disk Access in System Settings if results seem incomplete.".to_string());
    }

    Ok(out)
}
