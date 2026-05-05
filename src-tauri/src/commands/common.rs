use serde::Serialize;
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

pub const PARTIAL_HASH_BYTES: usize = 64 * 1024;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FileItemDto {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub last_accessed: String,
    pub is_duplicate: bool,
    pub ai_safety_score: f64,
    pub category: String,
    pub recommended: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub root_folder: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
pub struct ScanResultDto {
    pub category: String,
    pub items: Vec<FileItemDto>,
    pub safety_level: String,
    pub space_to_free: String,
    pub recommendation: String,
    pub confidence: f64,
}

#[derive(Serialize, Clone, Debug)]
pub struct DiskStatsDto {
    pub free_gb: f64,
    pub total_gb: f64,
    pub mount_path: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct TrashResultDto {
    pub freed_label: String,
    pub freed_bytes: u64,
    pub succeeded: Vec<String>,
    pub failed: Vec<TrashErrorDto>,
}

#[derive(Serialize, Clone, Debug)]
pub struct TrashErrorDto {
    pub path: String,
    pub message: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StorageEntryDto {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub icon_hint: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppInfoDto {
    pub name: String,
    pub bundle_id: String,
    pub path: String,
    pub size_bytes: u64,
    pub last_used: Option<String>,
    pub has_support_files: bool,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TrashItemDto {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RelatedPathDto {
    pub label: String,
    pub path: String,
    pub size_bytes: u64,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UninstallAppDto {
    pub name: String,
    pub bundle_id: String,
    pub app_path: String,
    pub app_size_bytes: u64,
    pub last_used: Option<String>,
    pub related: Vec<RelatedPathDto>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ShellProbeDto {
    pub tool: String,
    pub cache_path: String,
    pub size_bytes: u64,
    pub description: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FilePreviewDto {
    pub path: String,
    pub mime_hint: String,
    pub text_content: Option<String>,
    pub base64_image: Option<String>,
    pub size: u64,
    pub modified: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgressPayload {
    /// Human-readable stage line (e.g. "Scanning Caches...")
    pub stage: String,
    /// Machine-oriented phase: `walk` | `analyze` | `finalize` (stable for the web client — see
    /// `src/lib/scanPhaseCopy.ts` and `src/components/Scanner.tsx`).
    pub phase: String,
    pub pct: f64,
    pub files_found: usize,
    pub items_flagged: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_path: Option<String>,
}

pub struct FileRecord {
    pub path: PathBuf,
    pub size: u64,
    pub modified_ms: i64,
}

pub fn home_dir() -> Result<PathBuf, String> {
    dirs::home_dir().ok_or_else(|| "Could not resolve home directory".to_string())
}

pub fn path_id(path: &Path) -> String {
    let s = path.to_string_lossy();
    let mut h = Sha256::new();
    h.update(s.as_bytes());
    hex::encode(h.finalize())[..16].to_string()
}

pub fn iso8601(ms: i64) -> String {
    chrono::DateTime::from_timestamp_millis(ms)
        .unwrap_or_else(|| chrono::DateTime::from_timestamp(0, 0).unwrap())
        .to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}

pub fn format_space(bytes: u64) -> String {
    if bytes > 1024 * 1024 * 1024 {
        format!("{:.1} GB", bytes as f64 / (1024.0 * 1024.0 * 1024.0))
    } else {
        format!("{:.0} MB", bytes as f64 / (1024.0 * 1024.0))
    }
}

#[cfg(unix)]
fn delete_error_looks_permission_denied(s: &str) -> bool {
    s.contains("Permission denied")
        || s.contains("permission denied")
        || s.contains("(os error 13)")
        || s.contains("os error 13")
}

#[cfg(not(unix))]
fn delete_error_looks_permission_denied(s: &str) -> bool {
    s.contains("Permission denied") || s.contains("permission denied")
}

fn delete_hint_already_covers_apps_root(s: &str) -> bool {
    s.contains("Full Disk Access")
        || s.contains("administrator password")
        || s.contains("Privileged removal")
        || s.contains("owned by root")
}

#[cfg(target_os = "macos")]
fn hints_fda_folder_territory(path_lossy: &str) -> bool {
    path_lossy.contains("/Library/")
}

/// Guidance for Trash / delete failures — distinguishes `/Applications` root-owned bundles vs FDA.
pub fn explain_delete_failure_for_path(path_for_hint: Option<&Path>, base_err: impl std::fmt::Display) -> String {
    let s = base_err.to_string();
    if !delete_error_looks_permission_denied(&s) {
        return s;
    }
    #[cfg(target_os = "macos")]
    {
        if let Some(p) = path_for_hint {
            let pl = p.to_string_lossy().to_string();
            let is_app = p.extension().and_then(|e| e.to_str()) == Some("app");
            let under_sys_apps =
                is_app && (pl.starts_with("/Applications/") || pl.starts_with("/Applications"));
            let under_home_apps = is_app
                && dirs::home_dir()
                    .map(|h| {
                        let pr = format!("{}", h.join("Applications").display());
                        pl.starts_with(&pr)
                    })
                    .unwrap_or(false);
            if under_sys_apps && !delete_hint_already_covers_apps_root(&s) {
                return format!(
                    "{s} — Full Disk Access does not bypass file ownership; many /Applications apps are owned by root. Macfyi can show a password prompt for removal, or use Finder → Move to Trash."
                );
            }
            if under_home_apps && !delete_hint_already_covers_apps_root(&s) {
                return format!(
                    "{s} — Folder may be owned by another user or root. Approve the administrator prompt if offered, or remove via Finder."
                );
            }
            if hints_fda_folder_territory(&pl) && !delete_hint_already_covers_apps_root(&s) {
                return format!(
                    "{s} — Grant Macfyi Full Disk Access: System Settings → Privacy & Security → Full Disk Access → enable Macfyi, then quit and reopen the app."
                );
            }
        }
        if !delete_hint_already_covers_apps_root(&s) {
            return format!(
                "{s} — Grant Macfyi Full Disk Access: System Settings → Privacy & Security → Full Disk Access → enable Macfyi, then quit and reopen the app."
            );
        }
    }
    s
}

#[inline]
pub fn explain_io_delete_error(path: &Path, err: &std::io::Error) -> String {
    explain_delete_failure_for_path(Some(path), err)
}

pub fn partial_file_hash(path: &Path) -> std::io::Result<Vec<u8>> {
    use std::io::Read;
    let mut f = std::fs::File::open(path)?;
    let mut buf = vec![0u8; PARTIAL_HASH_BYTES];
    let n = f.read(&mut buf)?;
    buf.truncate(n);
    let mut h = Sha256::new();
    h.update(&buf);
    Ok(h.finalize().to_vec())
}

pub fn modified_ms(meta: &std::fs::Metadata) -> i64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub fn file_extension(p: &Path) -> String {
    p.extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default()
}

pub fn classify_extension(ext: &str) -> &'static str {
    match ext {
        "jpg" | "jpeg" | "png" | "gif" | "webp" | "heic" | "bmp" | "tiff" | "svg" | "ico" => "image",
        "mp4" | "mov" | "avi" | "mkv" | "wmv" | "flv" | "m4v" | "webm" => "video",
        "mp3" | "wav" | "aac" | "flac" | "ogg" | "m4a" | "wma" => "audio",
        "pdf" | "doc" | "docx" | "xls" | "xlsx" | "ppt" | "pptx" | "txt" | "rtf" | "odt" | "pages" | "numbers" | "key" => "document",
        "zip" | "tar" | "gz" | "bz2" | "rar" | "7z" | "dmg" | "iso" | "xz" | "pkg" => "archive",
        "rs" | "js" | "ts" | "tsx" | "jsx" | "py" | "rb" | "go" | "java" | "c" | "cpp" | "h" | "swift" | "kt" | "cs" | "php" | "html" | "css" | "scss" | "json" | "yaml" | "yml" | "toml" | "xml" | "sh" | "bash" | "zsh" | "sql" | "md" => "code",
        "app" | "exe" | "msi" | "deb" | "rpm" => "application",
        _ => "other",
    }
}

pub fn root_folder_label(home: &Path, file_path: &Path) -> String {
    if let Ok(rel) = file_path.strip_prefix(home) {
        let first = rel.components().next();
        if let Some(c) = first {
            return c.as_os_str().to_string_lossy().to_string();
        }
    }
    if file_path.starts_with("/Applications") {
        return "Applications".to_string();
    }
    "Other".to_string()
}

pub fn build_category(
    category: &str,
    items: Vec<FileItemDto>,
    safety: &str,
    recommendation: &str,
    confidence: f64,
) -> Option<ScanResultDto> {
    if items.is_empty() {
        return None;
    }
    let total: u64 = items.iter().map(|i| i.size).sum();
    Some(ScanResultDto {
        category: category.to_string(),
        items,
        safety_level: safety.to_string(),
        space_to_free: format_space(total),
        recommendation: recommendation.to_string(),
        confidence,
    })
}
