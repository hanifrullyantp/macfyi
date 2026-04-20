//! Disk Explorer: one-level directory scan with recursive sizes, risk labels, and safe trash-only moves.
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant, UNIX_EPOCH};
use walkdir::WalkDir;

use super::common::home_dir;

const SIZE_WALK_TIMEOUT: Duration = Duration::from_secs(30);
const SIZE_MAX_ENTRIES: u64 = 500_000;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "PascalCase")]
pub enum NodeType {
    Cache,
    Developer,
    AppSupport,
    Media,
    UserData,
    System,
    Trash,
    Downloads,
    Application,
    Log,
    Backup,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "PascalCase")]
pub enum RiskLevel {
    Safe,
    Caution,
    Risky,
    Locked,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskNodeDto {
    pub path: String,
    pub display_name: String,
    pub redacted_path: String,
    pub size_bytes: u64,
    pub item_count: u64,
    pub children: Vec<DiskNodeDto>,
    pub node_type: NodeType,
    pub risk_level: RiskLevel,
    pub is_expandable: bool,
    pub is_accessible: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_modified: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskExplorerVolumeDto {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub free_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileInfoDto {
    pub name: String,
    pub size_bytes: u64,
    pub extension: String,
    pub last_modified: String,
}

fn expand_scan_path(path: &str) -> Result<PathBuf, String> {
    let p = path.trim();
    if p == "~" || p == "~/" {
        return home_dir();
    }
    if let Some(rest) = p.strip_prefix("~/") {
        let h = home_dir()?;
        return Ok(h.join(rest));
    }
    Ok(PathBuf::from(p))
}

fn redact_path_str(full: &str) -> String {
    if let Ok(h) = home_dir() {
        let hs = h.to_string_lossy();
        if full.starts_with(hs.as_ref()) {
            let tail = &full[hs.len()..];
            return format!("~{}", tail);
        }
    }
    full.to_string()
}

fn classify_node(path: &Path) -> NodeType {
    let s = path.to_string_lossy().to_lowercase();
    if s.contains("/caches") || s.ends_with("/caches") {
        return NodeType::Cache;
    }
    if s.contains("/developer") || s.contains("/xcode") {
        return NodeType::Developer;
    }
    if s.contains("/application support") {
        return NodeType::AppSupport;
    }
    if s.contains("/logs") || s.ends_with("/logs") {
        return NodeType::Log;
    }
    if s.contains("/.trash") || s.ends_with(".trash") {
        return NodeType::Trash;
    }
    if s.contains("/movies")
        || s.contains("/music")
        || s.contains("photos library.photoslibrary")
    {
        return NodeType::Media;
    }
    if s.contains("/downloads") {
        return NodeType::Downloads;
    }
    if s.contains("/applications") || s.ends_with(".app") {
        return NodeType::Application;
    }
    if s.contains("mobilesync") || s.contains("/backups") {
        return NodeType::Backup;
    }
    if s.starts_with("/system")
        || s.starts_with("/usr")
        || s.starts_with("/sbin")
        || s.starts_with("/bin")
        || s.starts_with("/private/var")
    {
        return NodeType::System;
    }
    if s.contains("/documents") || s.contains("/desktop") || s.contains("/pictures") {
        return NodeType::UserData;
    }
    NodeType::Other
}

fn assess_risk(node_type: &NodeType) -> RiskLevel {
    match node_type {
        NodeType::System => RiskLevel::Locked,
        NodeType::Cache | NodeType::Trash | NodeType::Log | NodeType::Downloads => RiskLevel::Safe,
        NodeType::Developer => RiskLevel::Caution,
        NodeType::Backup | NodeType::Media | NodeType::UserData => RiskLevel::Caution,
        NodeType::AppSupport | NodeType::Application | NodeType::Other => RiskLevel::Risky,
    }
}

fn iso_time(meta: &std::fs::Metadata) -> Option<String> {
    let secs = meta.modified().ok()?.duration_since(UNIX_EPOCH).ok()?.as_secs() as i64;
    chrono::DateTime::from_timestamp(secs, 0).map(|dt| dt.to_rfc3339())
}

/// Recursive size without following symlinks; bounded by time and entry count.
fn calculate_dir_size(path: &Path) -> (u64, bool) {
    if path.is_file() {
        return (fs::metadata(path).map(|m| m.len()).unwrap_or(0), true);
    }
    let start = Instant::now();
    let mut total: u64 = 0;
    let mut entries: u64 = 0;
    let mut complete = true;

    for e in WalkDir::new(path).follow_links(false).into_iter().filter_map(|x| x.ok()) {
        entries += 1;
        if entries > SIZE_MAX_ENTRIES || start.elapsed() > SIZE_WALK_TIMEOUT {
            complete = false;
            break;
        }
        if e.file_type().is_file() {
            if let Ok(m) = e.metadata() {
                total = total.saturating_add(m.len());
            }
        }
    }
    (total, complete)
}

fn count_direct_children(path: &Path) -> u64 {
    fs::read_dir(path)
        .map(|d| d.flatten().count() as u64)
        .unwrap_or(0)
}

#[tauri::command]
pub fn check_full_disk_access() -> bool {
    let p = Path::new("/Library/Application Support/com.apple.TCC");
    fs::read_dir(p).is_ok()
}

#[tauri::command]
pub fn open_fda_system_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let url = "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles";
        let status = std::process::Command::new("open")
            .arg(url)
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            return Ok(());
        }
        return Err("Failed to open System Settings".to_string());
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("FDA settings are macOS-only".to_string())
    }
}

#[tauri::command]
pub fn disk_explorer_volume_stats() -> Result<DiskExplorerVolumeDto, String> {
    let home = home_dir()?;
    let home_s = home.to_string_lossy().to_string();
    let disks = sysinfo::Disks::new_with_refreshed_list();
    let mut best: Option<(u64, u64, u64)> = None;
    let mut best_mount_len = 0usize;

    for disk in disks.list() {
        let mount = disk.mount_point().to_string_lossy().to_string();
        if home_s.starts_with(&mount) && mount.len() >= best_mount_len {
            let total = disk.total_space();
            let free = disk.available_space();
            let used = total.saturating_sub(free);
            best = Some((total, used, free));
            best_mount_len = mount.len();
        }
    }

    let (total, used, free) = best.unwrap_or((1, 0, 0));
    Ok(DiskExplorerVolumeDto {
        total_bytes: total,
        used_bytes: used,
        free_bytes: free,
    })
}

#[tauri::command]
pub fn scan_disk_level(path: String) -> Result<Vec<DiskNodeDto>, String> {
    let root = expand_scan_path(&path)?;
    if !root.exists() {
        return Err(format!(
            "Path does not exist: {}",
            redact_path_str(&root.to_string_lossy())
        ));
    }

    let mut nodes: Vec<DiskNodeDto> = Vec::new();
    let read_it = fs::read_dir(&root).map_err(|e| format!("Cannot read directory: {e}"))?;

    for entry in read_it.flatten() {
        let p = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        let is_symlink = fs::symlink_metadata(&p)
            .map(|m| m.file_type().is_symlink())
            .unwrap_or(false);

        if is_symlink {
            let redacted = redact_path_str(&p.to_string_lossy());
            nodes.push(DiskNodeDto {
                path: p.to_string_lossy().to_string(),
                display_name: format!("{name} (symlink)"),
                redacted_path: redacted,
                size_bytes: 0,
                item_count: 0,
                children: vec![],
                node_type: NodeType::Other,
                risk_level: RiskLevel::Caution,
                is_expandable: false,
                is_accessible: true,
                last_modified: fs::symlink_metadata(&p).ok().and_then(|m| iso_time(&m)),
            });
            continue;
        }

        let meta = match fs::metadata(&p) {
            Ok(m) => m,
            Err(_) => {
                let redacted = redact_path_str(&p.to_string_lossy());
                nodes.push(DiskNodeDto {
                    path: p.to_string_lossy().to_string(),
                    display_name: name.clone(),
                    redacted_path: redacted,
                    size_bytes: 0,
                    item_count: 0,
                    children: vec![],
                    node_type: NodeType::Other,
                    risk_level: RiskLevel::Locked,
                    is_expandable: false,
                    is_accessible: false,
                    last_modified: None,
                });
                continue;
            }
        };

        let is_dir = meta.is_dir();
        let (size_bytes, _complete) = if is_dir {
            calculate_dir_size(&p)
        } else {
            (meta.len(), true)
        };

        let node_type = classify_node(&p);
        let risk_level = assess_risk(&node_type);
        let item_count = if is_dir {
            count_direct_children(&p)
        } else {
            0
        };
        let last_modified = iso_time(&meta);
        let is_accessible = true;
        let is_expandable = is_dir && risk_level != RiskLevel::Locked;

        let redacted = redact_path_str(&p.to_string_lossy());

        nodes.push(DiskNodeDto {
            path: p.to_string_lossy().to_string(),
            display_name: name,
            redacted_path: redacted,
            size_bytes,
            item_count,
            children: vec![],
            node_type,
            risk_level,
            is_expandable,
            is_accessible,
            last_modified,
        });
    }

    nodes.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    Ok(nodes)
}

#[tauri::command]
pub fn move_node_to_trash(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    trash::delete(&p).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_node_file_list(path: String, limit: u32) -> Result<Vec<FileInfoDto>, String> {
    let root = expand_scan_path(&path)?;
    if !root.is_dir() {
        return Err("Not a directory".to_string());
    }

    let lim = limit.max(1).min(500) as usize;
    let mut files: Vec<(PathBuf, u64, String)> = Vec::new();

    for e in WalkDir::new(&root).follow_links(false).into_iter().filter_map(|x| x.ok()) {
        if !e.file_type().is_file() {
            continue;
        }
        let p = e.path().to_path_buf();
        let sz = e.metadata().map(|m| m.len()).unwrap_or(0);
        let lm = e
            .metadata()
            .ok()
            .and_then(|m| iso_time(&m))
            .unwrap_or_default();
        files.push((p, sz, lm));
    }

    files.sort_by(|a, b| b.1.cmp(&a.1));
    files.truncate(lim);

    let out = files
        .into_iter()
        .map(|(p, size_bytes, last_modified)| FileInfoDto {
            name: p
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default(),
            size_bytes,
            extension: p
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string(),
            last_modified,
        })
        .collect();

    Ok(out)
}

#[tauri::command]
pub fn export_scan_report(nodes: Vec<DiskNodeDto>, format: String) -> Result<String, String> {
    let downloads = home_dir()?.join("Downloads");
    fs::create_dir_all(&downloads).map_err(|e| e.to_string())?;

    let ts = chrono::Local::now().format("%Y%m%d-%H%M%S");
    let ext = if format.eq_ignore_ascii_case("json") {
        "json"
    } else {
        "txt"
    };
    let out_path = downloads.join(format!("macfyi-disk-report-{ts}.{ext}"));

    let body = if ext == "json" {
        serde_json::to_string_pretty(&nodes).map_err(|e| e.to_string())?
    } else {
        let mut s = String::from("Macfyi Disk Explorer Report\n\n");
        fn walk(nodes: &[DiskNodeDto], depth: usize, buf: &mut String) {
            for n in nodes {
                let indent = "  ".repeat(depth);
                buf.push_str(&format!(
                    "{indent}{} | {} | {} bytes | {:?} | {:?}\n",
                    n.display_name, n.redacted_path, n.size_bytes, n.node_type, n.risk_level
                ));
                if !n.children.is_empty() {
                    walk(&n.children, depth + 1, buf);
                }
            }
        }
        walk(&nodes, 0, &mut s);
        s
    };

    fs::write(&out_path, body).map_err(|e| e.to_string())?;
    Ok(out_path.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::path::PathBuf;

    #[test]
    fn test_classify_caches() {
        let p = PathBuf::from("/Users/test/Library/Caches");
        assert!(matches!(classify_node(&p), NodeType::Cache));
    }

    #[test]
    fn test_classify_developer() {
        let p = PathBuf::from("/Users/test/Library/Developer");
        assert!(matches!(classify_node(&p), NodeType::Developer));
    }

    #[test]
    fn test_classify_system() {
        let p = PathBuf::from("/System/Library");
        assert!(matches!(classify_node(&p), NodeType::System));
    }

    #[test]
    fn test_classify_trash() {
        let p = PathBuf::from("/Users/test/.Trash");
        assert!(matches!(classify_node(&p), NodeType::Trash));
    }

    #[test]
    fn test_classify_downloads() {
        let p = PathBuf::from("/Users/test/Downloads");
        assert!(matches!(classify_node(&p), NodeType::Downloads));
    }

    #[test]
    fn test_classify_media() {
        let p = PathBuf::from("/Users/test/Movies");
        assert!(matches!(classify_node(&p), NodeType::Media));
    }

    #[test]
    fn test_risk_system_is_locked() {
        assert!(matches!(assess_risk(&NodeType::System), RiskLevel::Locked));
    }

    #[test]
    fn test_risk_cache_is_safe() {
        assert!(matches!(assess_risk(&NodeType::Cache), RiskLevel::Safe));
    }

    #[test]
    fn test_risk_developer_is_caution() {
        assert!(matches!(assess_risk(&NodeType::Developer), RiskLevel::Caution));
    }

    #[test]
    fn test_risk_app_support_is_risky() {
        assert!(matches!(assess_risk(&NodeType::AppSupport), RiskLevel::Risky));
    }

    #[test]
    fn test_redact_replaces_home() {
        let home = std::env::var("HOME").expect("HOME must be set for this test");
        let input = format!("{home}/Library/Caches");
        let result = redact_path_str(&input);
        assert!(result.starts_with("~/Library/Caches"), "got {result}");
    }

    #[test]
    fn test_redact_non_home_unchanged() {
        assert_eq!(redact_path_str("/System/Library"), "/System/Library");
    }

    #[test]
    fn test_dir_size_nonexistent_returns_zero() {
        let p = PathBuf::from("/this/path/does/not/exist/12345");
        let (size, _complete) = calculate_dir_size(&p);
        assert_eq!(size, 0);
    }

    #[test]
    fn test_dir_size_tmp_dir() {
        let tmp = std::env::temp_dir().join("macfyi_test_dir_size");
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(&tmp).unwrap();
        let file = tmp.join("test.txt");
        let mut f = std::fs::File::create(&file).unwrap();
        f.write_all(b"hello world").unwrap();

        let (size, _complete) = calculate_dir_size(&tmp);
        assert!(size >= 11, "Expected >= 11 bytes, got {size}");

        let _ = std::fs::remove_dir_all(&tmp);
    }
}
