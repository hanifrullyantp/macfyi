use super::common::*;
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
