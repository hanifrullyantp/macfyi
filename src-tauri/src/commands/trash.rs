use super::common::*;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

fn resolved_home_dir() -> Result<PathBuf, String> {
    #[cfg(target_os = "macos")]
    {
        if let Ok(h) = std::env::var("HOME") {
            let p = PathBuf::from(h.trim());
            if p.is_absolute() {
                return Ok(p);
            }
        }
    }
    home_dir()
}

#[cfg(target_os = "macos")]
fn macos_trash_roots() -> Result<Vec<PathBuf>, String> {
    let mut roots = Vec::new();
    let home = resolved_home_dir()?;
    roots.push(home.join(".Trash"));
    let uid = unsafe { libc::getuid() };
    if let Ok(vol_entries) = fs::read_dir("/Volumes") {
        for e in vol_entries.flatten() {
            let vol = e.path();
            let t = vol.join(".Trashes").join(uid.to_string());
            if t.is_dir() {
                roots.push(t);
            }
        }
    }
    Ok(roots)
}

#[cfg(not(target_os = "macos"))]
fn macos_trash_roots() -> Result<Vec<PathBuf>, String> {
    let home = resolved_home_dir()?;
    Ok(vec![home.join(".Trash")])
}

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
    let mut seen: HashSet<String> = HashSet::new();
    let mut out = Vec::new();

    for trash in macos_trash_roots()? {
        if !trash.exists() {
            continue;
        }
        let entries = match fs::read_dir(&trash) {
            Ok(e) => e,
            Err(err) => {
                log::warn!("list_trash_items: cannot read {:?}: {}", trash, err);
                continue;
            }
        };
        for entry in entries.flatten() {
            let path = entry.path();
            let name = path
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default();
            if name.is_empty() || name == ".DS_Store" {
                continue;
            }
            let pstr = path.to_string_lossy().to_string();
            if seen.contains(&pstr) {
                continue;
            }
            seen.insert(pstr.clone());
            let size_bytes = path_size_bytes(&path);
            let display_name = if trash.file_name().and_then(|n| n.to_str()) == Some(".Trash") {
                name
            } else {
                let vol = trash
                    .parent()
                    .and_then(|p| p.parent())
                    .and_then(|v| v.file_name())
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_else(|| "Volume".to_string());
                format!("{name} ({vol})")
            };
            out.push(TrashItemDto {
                name: display_name,
                path: pstr,
                size_bytes,
            });
        }
    }

    out.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    Ok(out)
}

#[tauri::command]
pub fn empty_trash() -> Result<TrashResultDto, String> {
    let mut freed: u64 = 0;
    let mut succeeded = Vec::new();
    let mut failed = Vec::new();

    for trash in macos_trash_roots()? {
        if !trash.exists() {
            continue;
        }
        let entries: Vec<_> = match fs::read_dir(&trash) {
            Ok(e) => e.flatten().map(|e| e.path()).collect(),
            Err(err) => {
                failed.push(TrashErrorDto {
                    path: trash.to_string_lossy().to_string(),
                    message: err.to_string(),
                });
                continue;
            }
        };
        for path in entries {
            let name = path.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
            if name == ".DS_Store" {
                continue;
            }
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
    let home = resolved_home_dir()?;
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

/// QA: same code path as the `move_paths_to_trash` Tauri IPC handler — validates `trash` crate + macOS
/// permissions on a user-writable temp file (desktop smoke; does not simulate Full Disk Access).
#[cfg(all(test, target_os = "macos"))]
mod smoke_tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn smoke_move_paths_to_trash_moves_temp_file() {
        let base = std::env::temp_dir().join(format!("macfyi-trash-smoke-{}", std::process::id()));
        fs::create_dir_all(&base).expect("tmpdir");
        let file = base.join("macfyi_smoke_move_to_trash.txt");
        let mut f = fs::File::create(&file).expect("create");
        f.write_all(b"macfyi trash smoke-test").expect("write");
        drop(f);

        let path_str = file.to_string_lossy().to_string();
        let res = move_paths_to_trash(vec![path_str]).expect("command returns Ok");

        assert!(
            res.failed.is_empty(),
            "expected no failures, got {:?}",
            res.failed
        );
        assert_eq!(res.succeeded.len(), 1);
        assert!(!file.exists(), "file should no longer exist at original path");
        fs::remove_dir_all(&base).ok();
    }
}
