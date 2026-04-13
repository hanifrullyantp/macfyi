use super::common::*;
use std::collections::HashSet;
use std::path::PathBuf;
use walkdir::WalkDir;

fn parse_bundle_id(app_path: &std::path::Path) -> Option<(String, String)> {
    let plist_path = app_path.join("Contents/Info.plist");
    if !plist_path.exists() {
        return None;
    }
    let data = std::fs::read(&plist_path).ok()?;
    let cursor = std::io::Cursor::new(data);
    let plist: plist::Value = plist::Value::from_reader(cursor).ok()?;
    let dict = plist.as_dictionary()?;
    let bundle_id = dict
        .get("CFBundleIdentifier")
        .and_then(|v| v.as_string())
        .unwrap_or("")
        .to_string();
    let name = dict
        .get("CFBundleName")
        .or_else(|| dict.get("CFBundleDisplayName"))
        .and_then(|v| v.as_string())
        .unwrap_or("")
        .to_string();
    let name = if name.is_empty() {
        app_path
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default()
    } else {
        name
    };
    Some((bundle_id, name))
}

fn app_last_used(app_path: &std::path::Path) -> Option<String> {
    let out = std::process::Command::new("mdls")
        .args(["-name", "kMDItemLastUsedDate", "-raw"])
        .arg(app_path)
        .output()
        .ok()?;
    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if s.is_empty() || s == "(null)" {
        return None;
    }
    Some(s)
}

fn dir_size_fast(path: &std::path::Path) -> u64 {
    if !path.exists() {
        return 0;
    }
    WalkDir::new(path)
        .follow_links(false)
        .max_depth(10)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.metadata().ok())
        .map(|m| m.len())
        .sum()
}

#[tauri::command]
pub fn app_audit() -> Result<Vec<AppInfoDto>, String> {
    let home = home_dir()?;
    let mut results = Vec::new();

    let app_dirs = vec![
        PathBuf::from("/Applications"),
        home.join("Applications"),
    ];

    for dir in app_dirs {
        if !dir.exists() {
            continue;
        }
        let entries = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.extension().map(|e| e == "app").unwrap_or(false) {
                continue;
            }
            let (bundle_id, name) = match parse_bundle_id(&path) {
                Some(v) => v,
                None => {
                    let n = path.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
                    (String::new(), n)
                }
            };

            let size = dir_size_fast(&path);
            let last_used = app_last_used(&path);
            let support = if !bundle_id.is_empty() {
                home.join("Library/Application Support").join(&bundle_id).exists()
                    || home.join("Library/Containers").join(&bundle_id).exists()
            } else {
                false
            };

            results.push(AppInfoDto {
                name,
                bundle_id,
                path: path.to_string_lossy().to_string(),
                size_bytes: size,
                last_used,
                has_support_files: support,
            });
        }
    }

    results.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    Ok(results)
}

#[tauri::command]
pub fn orphan_detect() -> Result<Vec<FileItemDto>, String> {
    let home = home_dir()?;

    // Collect all installed bundle IDs
    let mut installed_ids: HashSet<String> = HashSet::new();
    for dir in &[PathBuf::from("/Applications"), home.join("Applications")] {
        if !dir.exists() {
            continue;
        }
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.extension().map(|e| e == "app").unwrap_or(false) {
                    if let Some((bid, _)) = parse_bundle_id(&p) {
                        if !bid.is_empty() {
                            installed_ids.insert(bid);
                        }
                    }
                }
            }
        }
    }

    let library_dirs = vec![
        home.join("Library/Application Support"),
        home.join("Library/Containers"),
        home.join("Library/Caches"),
        home.join("Library/Preferences"),
        home.join("Library/Saved Application State"),
    ];

    let mut orphans = Vec::new();

    for lib_dir in &library_dirs {
        if !lib_dir.exists() {
            continue;
        }
        let entries = match std::fs::read_dir(lib_dir) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            // Only check entries that look like bundle IDs (com.xxx.xxx)
            if !name.contains('.') || name.starts_with('.') {
                continue;
            }
            let parts: Vec<&str> = name.split('.').collect();
            if parts.len() < 2 {
                continue;
            }
            // Check if this bundle ID exists in installed apps
            if installed_ids.contains(&name) {
                continue;
            }
            // Also skip if any installed ID is a prefix
            let is_related = installed_ids.iter().any(|id| name.starts_with(id) || id.starts_with(&name));
            if is_related {
                continue;
            }

            let path = entry.path();
            let size = dir_size_fast(&path);
            if size < 100 * 1024 {
                continue;
            }

            let mtime = entry
                .metadata()
                .ok()
                .map(|m| modified_ms(&m))
                .unwrap_or(0);

            orphans.push(FileItemDto {
                id: path_id(&path),
                name: name.clone(),
                path: path.to_string_lossy().to_string(),
                size,
                last_accessed: iso8601(mtime),
                is_duplicate: false,
                ai_safety_score: 0.82,
                category: "app_leftovers".to_string(),
                recommended: true,
                reason: Some(format!(
                    "No matching app installed for '{}'",
                    name
                )),
                file_type: Some("support".to_string()),
                root_folder: Some(
                    lib_dir
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default(),
                ),
            });
        }
    }

    orphans.sort_by(|a, b| b.size.cmp(&a.size));
    orphans.truncate(60);
    Ok(orphans)
}
