use super::common::*;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

fn path_size_bytes(path: &Path) -> u64 {
    if !path.exists() {
        return 0;
    }
    if path.is_file() {
        return fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    }
    WalkDir::new(path)
        .follow_links(false)
        .max_depth(20)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.metadata().ok())
        .map(|m| m.len())
        .sum()
}

fn remove_path_permanent(path: &Path) -> Result<u64, String> {
    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
    let size = meta.len();
    if meta.is_dir() {
        fs::remove_dir_all(path).map_err(|e| e.to_string())?;
    } else {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(size)
}

#[tauri::command]
pub fn delete_paths_permanently(paths: Vec<String>) -> Result<TrashResultDto, String> {
    let mut freed: u64 = 0;
    let mut succeeded = Vec::new();
    let mut failed = Vec::new();

    for p in paths {
        let path = PathBuf::from(&p);
        match remove_path_permanent(&path) {
            Ok(sz) => {
                freed += sz;
                succeeded.push(p);
            }
            Err(e) => failed.push(TrashErrorDto {
                path: p,
                message: e,
            }),
        }
    }

    Ok(TrashResultDto {
        freed_label: format_space(freed),
        freed_bytes: freed,
        succeeded,
        failed,
    })
}

#[tauri::command]
pub fn move_paths_to_trash(paths: Vec<String>) -> Result<TrashResultDto, String> {
    let mut freed: u64 = 0;
    let mut succeeded = Vec::new();
    let mut failed = Vec::new();

    for p in paths {
        let path = PathBuf::from(&p);
        let size = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
        match trash::delete(&path) {
            Ok(()) => {
                freed += size;
                succeeded.push(p);
            }
            Err(e) => failed.push(TrashErrorDto {
                path: p,
                message: e.to_string(),
            }),
        }
    }

    Ok(TrashResultDto {
        freed_label: format_space(freed),
        freed_bytes: freed,
        succeeded,
        failed,
    })
}

#[tauri::command]
pub fn list_trash_items() -> Result<Vec<TrashItemDto>, String> {
    let home = home_dir()?;
    let trash = home.join(".Trash");
    if !trash.exists() {
        return Ok(vec![]);
    }
    let mut out = Vec::new();
    let entries = fs::read_dir(&trash).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        let name = path
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();
        if name.is_empty() {
            continue;
        }
        let size_bytes = path_size_bytes(&path);
        out.push(TrashItemDto {
            name,
            path: path.to_string_lossy().to_string(),
            size_bytes,
        });
    }
    out.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    Ok(out)
}

#[tauri::command]
pub fn empty_trash() -> Result<TrashResultDto, String> {
    let home = home_dir()?;
    let trash = home.join(".Trash");
    if !trash.exists() {
        return Ok(TrashResultDto {
            freed_label: "0 MB".to_string(),
            freed_bytes: 0,
            succeeded: vec![],
            failed: vec![],
        });
    }
    let mut freed: u64 = 0;
    let mut succeeded = Vec::new();
    let mut failed = Vec::new();
    let entries: Vec<_> = fs::read_dir(&trash)
        .map_err(|e| e.to_string())?
        .flatten()
        .map(|e| e.path())
        .collect();
    for path in entries {
        let pstr = path.to_string_lossy().to_string();
        match remove_path_permanent(&path) {
            Ok(sz) => {
                freed += sz;
                succeeded.push(pstr);
            }
            Err(e) => failed.push(TrashErrorDto {
                path: pstr,
                message: e,
            }),
        }
    }
    Ok(TrashResultDto {
        freed_label: format_space(freed),
        freed_bytes: freed,
        succeeded,
        failed,
    })
}

#[tauri::command]
pub fn open_user_trash() -> Result<(), String> {
    let home = home_dir()?;
    let trash_path = home.join(".Trash");
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(trash_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
