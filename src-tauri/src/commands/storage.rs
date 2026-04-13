use super::common::*;
use walkdir::WalkDir;

fn dir_size(path: &std::path::Path, max_depth: usize) -> u64 {
    if !path.exists() {
        return 0;
    }
    WalkDir::new(path)
        .follow_links(false)
        .max_depth(max_depth)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.metadata().ok())
        .map(|m| m.len())
        .sum()
}

#[tauri::command]
pub fn storage_breakdown() -> Result<Vec<StorageEntryDto>, String> {
    let home = home_dir()?;
    let mut entries = Vec::new();

    let folders: Vec<(&str, std::path::PathBuf, &str)> = vec![
        ("Applications", std::path::PathBuf::from("/Applications"), "app"),
        ("Documents", home.join("Documents"), "doc"),
        ("Downloads", home.join("Downloads"), "download"),
        ("Desktop", home.join("Desktop"), "desktop"),
        ("Pictures", home.join("Pictures"), "image"),
        ("Music", home.join("Music"), "audio"),
        ("Movies", home.join("Movies"), "video"),
        ("Mail", home.join("Library/Mail"), "mail"),
        ("Developer", home.join("Library/Developer"), "code"),
        ("Caches", home.join("Library/Caches"), "cache"),
        ("Application Support", home.join("Library/Application Support"), "support"),
        ("Logs", home.join("Library/Logs"), "log"),
    ];

    for (name, path, icon) in &folders {
        let size = dir_size(path, 12);
        if size > 0 {
            entries.push(StorageEntryDto {
                name: name.to_string(),
                path: path.to_string_lossy().to_string(),
                size_bytes: size,
                icon_hint: icon.to_string(),
            });
        }
    }

    entries.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    Ok(entries)
}

#[tauri::command]
pub fn get_disk_stats() -> Result<DiskStatsDto, String> {
    let home = home_dir()?;
    let home_s = home.to_string_lossy().to_string();

    let disks = sysinfo::Disks::new_with_refreshed_list();
    let mut best: Option<(f64, f64, String)> = None;

    for disk in disks.list() {
        let mount = disk.mount_point().to_string_lossy().to_string();
        if home_s.starts_with(&mount) {
            let total = disk.total_space() as f64;
            let free = disk.available_space() as f64;
            if best.as_ref().map(|b| mount.len() > b.2.len()).unwrap_or(true) {
                best = Some((free, total, mount));
            }
        }
    }

    let (free_b, total_b, mount_path) = best.unwrap_or((0.0, 1.0, "/".to_string()));
    Ok(DiskStatsDto {
        free_gb: free_b / (1024.0 * 1024.0 * 1024.0),
        total_gb: total_b / (1024.0 * 1024.0 * 1024.0),
        mount_path,
    })
}
