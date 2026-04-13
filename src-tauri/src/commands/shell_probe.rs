use super::common::*;
use std::path::PathBuf;
use walkdir::WalkDir;

fn dir_size_fast(path: &std::path::Path) -> u64 {
    if !path.exists() {
        return 0;
    }
    WalkDir::new(path)
        .follow_links(false)
        .max_depth(8)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.metadata().ok())
        .map(|m| m.len())
        .sum()
}

fn probe_command_cache(cmd: &str, args: &[&str]) -> Option<(PathBuf, u64)> {
    let out = std::process::Command::new(cmd)
        .args(args)
        .output()
        .ok()?;
    let path_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if path_str.is_empty() {
        return None;
    }
    let p = PathBuf::from(&path_str);
    if !p.exists() {
        return None;
    }
    let size = dir_size_fast(&p);
    Some((p, size))
}

#[tauri::command]
pub fn shell_probe() -> Result<Vec<ShellProbeDto>, String> {
    let mut results = Vec::new();

    // Homebrew
    if let Some((path, size)) = probe_command_cache("brew", &["--cache"]) {
        if size > 10 * 1024 * 1024 {
            results.push(ShellProbeDto {
                tool: "Homebrew".to_string(),
                cache_path: path.to_string_lossy().to_string(),
                size_bytes: size,
                description: "Package manager cache. Run `brew cleanup` to clear.".to_string(),
            });
        }
    }

    // npm
    if let Ok(out) = std::process::Command::new("npm")
        .args(["config", "get", "cache"])
        .output()
    {
        let path_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
        let p = PathBuf::from(&path_str);
        if p.exists() {
            let size = dir_size_fast(&p);
            if size > 10 * 1024 * 1024 {
                results.push(ShellProbeDto {
                    tool: "npm".to_string(),
                    cache_path: path_str,
                    size_bytes: size,
                    description: "Node.js package cache. Run `npm cache clean --force` to clear.".to_string(),
                });
            }
        }
    }

    // pip
    if let Ok(out) = std::process::Command::new("pip3")
        .args(["cache", "dir"])
        .output()
    {
        let path_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
        let p = PathBuf::from(&path_str);
        if p.exists() {
            let size = dir_size_fast(&p);
            if size > 5 * 1024 * 1024 {
                results.push(ShellProbeDto {
                    tool: "pip".to_string(),
                    cache_path: path_str,
                    size_bytes: size,
                    description: "Python package cache. Run `pip cache purge` to clear.".to_string(),
                });
            }
        }
    }

    // Cargo
    let home = home_dir()?;
    let cargo_reg = home.join(".cargo/registry");
    if cargo_reg.exists() {
        let size = dir_size_fast(&cargo_reg);
        if size > 50 * 1024 * 1024 {
            results.push(ShellProbeDto {
                tool: "Cargo (Rust)".to_string(),
                cache_path: cargo_reg.to_string_lossy().to_string(),
                size_bytes: size,
                description: "Rust crate registry cache. Run `cargo cache --autoclean` to trim.".to_string(),
            });
        }
    }

    Ok(results)
}
