use super::common::*;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

fn dir_size_bounded(path: &Path) -> u64 {
    if !path.exists() {
        return 0;
    }
    if path.is_file() {
        return std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    }
    WalkDir::new(path)
        .follow_links(false)
        .max_depth(12)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.metadata().ok())
        .map(|m| m.len())
        .sum()
}

fn push_if_exists(out: &mut Vec<RelatedPathDto>, label: &str, path: PathBuf) {
    if !path.exists() {
        return;
    }
    let sz = dir_size_bounded(&path);
    out.push(RelatedPathDto {
        label: label.to_string(),
        path: path.to_string_lossy().to_string(),
        size_bytes: sz,
    });
}

fn collect_related(home: &Path, bundle_id: &str, _app_path: &str) -> Vec<RelatedPathDto> {
    if bundle_id.is_empty() {
        return vec![];
    }
    let mut related = Vec::new();

    push_if_exists(
        &mut related,
        "Application Support",
        home.join("Library/Application Support").join(bundle_id),
    );
    push_if_exists(
        &mut related,
        "Containers",
        home.join("Library/Containers").join(bundle_id),
    );
    push_if_exists(
        &mut related,
        "Saved state",
        home
            .join("Library/Saved Application State")
            .join(format!("{bundle_id}.savedState")),
    );
    let pref = home
        .join("Library/Preferences")
        .join(format!("{bundle_id}.plist"));
    push_if_exists(&mut related, "Preferences", pref);

    let cache_dir = home.join("Library/Caches").join(bundle_id);
    push_if_exists(&mut related, "Caches", cache_dir);

    related.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    related
}

#[tauri::command]
pub fn list_uninstall_apps() -> Result<Vec<UninstallAppDto>, String> {
    let apps = crate::commands::apps::app_audit()?;
    let home = home_dir()?;
    let mut out: Vec<UninstallAppDto> = apps
        .into_iter()
        .map(|a| {
            let related = collect_related(&home, &a.bundle_id, &a.path);
            UninstallAppDto {
                name: a.name,
                bundle_id: a.bundle_id,
                app_path: a.path,
                app_size_bytes: a.size_bytes,
                last_used: a.last_used,
                related,
            }
        })
        .collect();
    out.sort_by(|a, b| {
        let ta = a.app_size_bytes + a.related.iter().map(|r| r.size_bytes).sum::<u64>();
        let tb = b.app_size_bytes + b.related.iter().map(|r| r.size_bytes).sum::<u64>();
        tb.cmp(&ta)
    });
    Ok(out)
}

fn canonical_ok(path: &Path) -> Result<PathBuf, String> {
    std::fs::canonicalize(path).map_err(|e| format!("Invalid path {}: {}", path.display(), e))
}

fn is_allowed_app_bundle(path: &Path) -> bool {
    if path.extension().and_then(|e| e.to_str()) != Some("app") {
        return false;
    }
    let Ok(canon) = std::fs::canonicalize(path) else {
        return false;
    };
    if canon.starts_with("/System") {
        return false;
    }
    let Ok(home) = home_dir() else {
        return false;
    };
    if let Ok(sys_apps) = std::fs::canonicalize(PathBuf::from("/Applications")) {
        if canon.starts_with(&sys_apps) {
            return true;
        }
    }
    let home_apps = home.join("Applications");
    if home_apps.exists() {
        if let Ok(h) = std::fs::canonicalize(&home_apps) {
            if canon.starts_with(&h) {
                return true;
            }
        }
    }
    false
}

fn related_paths_allowed(home: &Path, bundle_id: &str, app_path: &str) -> HashSet<PathBuf> {
    let mut set: HashSet<PathBuf> = HashSet::new();
    for r in collect_related(home, bundle_id, app_path) {
        if let Ok(c) = std::fs::canonicalize(PathBuf::from(&r.path)) {
            set.insert(c);
        }
    }
    set
}

fn validate_orphan_path(home: &Path, raw: &str) -> Result<PathBuf, String> {
    let p = PathBuf::from(raw);
    let canon = canonical_ok(&p)?;
    let lib = home.join("Library");
    let Ok(lib_canon) = std::fs::canonicalize(&lib) else {
        return Err("Cannot resolve ~/Library".into());
    };
    if !canon.starts_with(&lib_canon) {
        return Err("Path must be under your Library folder".into());
    }
    let rel = canon.strip_prefix(&lib_canon).map_err(|_| "strip".to_string())?;
    let first = rel
        .components()
        .next()
        .map(|c| c.as_os_str().to_string_lossy().to_string())
        .unwrap_or_default();
    match first.as_str() {
        "Application Support" | "Containers" | "Caches" | "Preferences" | "Saved Application State" => Ok(canon),
        _ => Err("Unsupported Library subfolder for leftover removal".into()),
    }
}

/// Remove orphan support-folder paths created by `orphan_detect` (validated under ~/Library).
#[tauri::command]
pub fn remove_orphan_paths(paths: Vec<String>, use_trash: bool) -> Result<TrashResultDto, String> {
    let home = home_dir()?;
    let mut to_remove: Vec<PathBuf> = Vec::new();
    for p in paths {
        to_remove.push(validate_orphan_path(&home, &p)?);
    }

    let mut freed: u64 = 0;
    let mut succeeded = Vec::new();
    let mut failed = Vec::new();

    for path in to_remove {
        let pstr = path.to_string_lossy().to_string();
        let size = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
        let res = if use_trash {
            trash::delete(&path).map_err(|e| e.to_string())
        } else {
            if path.is_dir() {
                std::fs::remove_dir_all(&path).map_err(|e| e.to_string())
            } else {
                std::fs::remove_file(&path).map_err(|e| e.to_string())
            }
        };
        match res {
            Ok(()) => {
                freed += size;
                succeeded.push(pstr);
            }
            Err(e) => failed.push(TrashErrorDto { path: pstr, message: e }),
        }
    }

    Ok(TrashResultDto {
        freed_label: format_space(freed),
        freed_bytes: freed,
        succeeded,
        failed,
    })
}

/// Move the app bundle (and optionally related Library paths) to Trash or delete permanently.
#[tauri::command]
pub fn uninstall_app_bundle(
    app_path: String,
    bundle_id: String,
    related_paths: Vec<String>,
    use_trash: bool,
) -> Result<TrashResultDto, String> {
    let home = home_dir()?;
    let app = PathBuf::from(&app_path);
    if !is_allowed_app_bundle(&app) {
        return Err("Only user-installed .app bundles under /Applications or ~/Applications can be removed.".into());
    }
    let app_canon = canonical_ok(&app)?;
    let allowed_related = related_paths_allowed(&home, &bundle_id, &app_path);
    let mut to_remove: Vec<PathBuf> = vec![app_canon];
    for rp in related_paths {
        let p = PathBuf::from(&rp);
        let c = canonical_ok(&p)?;
        if !allowed_related.contains(&c) {
            return Err(format!(
                "Related path not allowed for this app: {}",
                p.display()
            ));
        }
        to_remove.push(c);
    }

    let mut freed: u64 = 0;
    let mut succeeded = Vec::new();
    let mut failed = Vec::new();

    for path in to_remove {
        let pstr = path.to_string_lossy().to_string();
        let size = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
        let res = if use_trash {
            trash::delete(&path).map_err(|e| e.to_string())
        } else {
            if path.is_dir() {
                std::fs::remove_dir_all(&path).map_err(|e| e.to_string())
            } else {
                std::fs::remove_file(&path).map_err(|e| e.to_string())
            }
        };
        match res {
            Ok(()) => {
                freed += size;
                succeeded.push(pstr);
            }
            Err(e) => failed.push(TrashErrorDto { path: pstr, message: e }),
        }
    }

    Ok(TrashResultDto {
        freed_label: format_space(freed),
        freed_bytes: freed,
        succeeded,
        failed,
    })
}
