//! Shared path classification for Disk Explorer and System Storage Analyzer.
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::time::{Instant, UNIX_EPOCH};
use walkdir::WalkDir;

pub const SIZE_WALK_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(30);
pub const SIZE_MAX_ENTRIES: u64 = 500_000;

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

pub fn classify_node(path: &Path) -> NodeType {
    let s = path.to_string_lossy().to_lowercase();
    if s.contains("/caches") || s.ends_with("/caches") {
        return NodeType::Cache;
    }
    if s.contains("/containers/") {
        return NodeType::Other;
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

pub fn assess_risk(node_type: &NodeType) -> RiskLevel {
    match node_type {
        NodeType::System => RiskLevel::Locked,
        NodeType::Cache | NodeType::Trash | NodeType::Log | NodeType::Downloads => RiskLevel::Safe,
        NodeType::Developer => RiskLevel::Caution,
        NodeType::Backup | NodeType::Media | NodeType::UserData => RiskLevel::Caution,
        NodeType::AppSupport | NodeType::Application | NodeType::Other => RiskLevel::Risky,
    }
}

pub fn iso_time(meta: &std::fs::Metadata) -> Option<String> {
    let secs = meta.modified().ok()?.duration_since(UNIX_EPOCH).ok()?.as_secs() as i64;
    chrono::DateTime::from_timestamp(secs, 0).map(|dt| dt.to_rfc3339())
}

/// Recursive size without following symlinks; bounded by time and entry count.
pub fn calculate_dir_size(path: &Path) -> (u64, bool) {
    use std::fs;
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
    fn test_classify_containers() {
        let p = PathBuf::from("/Users/test/Library/Containers/com.apple.mail");
        assert!(matches!(classify_node(&p), NodeType::Other));
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
