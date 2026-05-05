use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub fn get_app_version(app: AppHandle) -> Result<String, String> {
    Ok(app.package_info().version.to_string())
}

#[tauri::command]
pub fn get_platform() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        let arch = std::env::consts::ARCH;
        let platform = match arch {
            "aarch64" => "macos-arm64",
            "x86_64" => "macos-intel",
            _ => "macos-intel",
        };
        return Ok(platform.to_string());
    }
    #[allow(unreachable_code)]
    Err("unsupported_platform".to_string())
}

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct UpdateProgressPayload {
    phase: String,
    pct: u8,
    message: String,
}

fn emit_progress(app: &AppHandle, phase: &str, pct: u8, message: &str) {
    let _ = app.emit(
        "update-progress",
        UpdateProgressPayload {
            phase: phase.to_string(),
            pct,
            message: message.to_string(),
        },
    );
}

fn run_checked(cmd: &mut Command, step: &str) -> Result<String, String> {
    let out = cmd.output().map_err(|e| format!("{step}: {e}"))?;
    if !out.status.success() {
        let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
        let detail = if !stderr.is_empty() { stderr } else { stdout };
        return Err(format!("{step}: {}", if detail.is_empty() { "command_failed".to_string() } else { detail }));
    }
    Ok(String::from_utf8_lossy(&out.stdout).to_string())
}

fn locate_mounted_volume(attach_stdout: &str) -> Option<String> {
    attach_stdout
        .lines()
        .filter_map(|line| line.split_whitespace().last())
        .find(|token| token.starts_with("/Volumes/"))
        .map(ToString::to_string)
}

fn locate_app_bundle(volume_path: &Path) -> Option<PathBuf> {
    let entries = std::fs::read_dir(volume_path).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|x| x.to_str()) == Some("app") {
            return Some(path);
        }
    }
    None
}

#[tauri::command]
pub async fn download_and_install_update(app: AppHandle, url: String) -> Result<(), String> {
    if url.trim().is_empty() {
        return Err("invalid_url".to_string());
    }
    let app_cloned = app.clone();
    tokio::task::spawn_blocking(move || download_and_install_sync(app_cloned, url))
        .await
        .map_err(|e| format!("update_join_failed: {e}"))?
}

fn download_and_install_sync(app: AppHandle, url: String) -> Result<(), String> {
    emit_progress(&app, "download", 5, "Preparing update download...");
    let tmp_root = std::env::temp_dir().join("macfyi-update");
    std::fs::create_dir_all(&tmp_root).map_err(|e| format!("tmp_create_failed: {e}"))?;
    let dmg_path = tmp_root.join("macfyi_update.dmg");
    let dmg_str = dmg_path.to_string_lossy().to_string();

    emit_progress(&app, "download", 35, "Downloading update...");
    run_checked(
        Command::new("curl").args(["-fL", "--retry", "2", "--connect-timeout", "15", &url, "-o", &dmg_str]),
        "download_failed",
    )?;

    emit_progress(&app, "install", 60, "Mounting update image...");
    let attach_out = run_checked(
        Command::new("hdiutil").args(["attach", &dmg_str, "-nobrowse", "-quiet"]),
        "mount_failed",
    )?;
    let volume = locate_mounted_volume(&attach_out).ok_or_else(|| "mount_failed: volume_not_found".to_string())?;
    let volume_path = PathBuf::from(&volume);
    let bundle_path = locate_app_bundle(&volume_path).ok_or_else(|| "install_failed: app_bundle_not_found".to_string())?;
    let target_path = PathBuf::from("/Applications/Macfyi.app");
    let bundle_str = bundle_path.to_string_lossy().to_string();
    let target_str = target_path.to_string_lossy().to_string();

    emit_progress(&app, "install", 80, "Replacing installed app...");
    if let Err(e) = run_checked(
        Command::new("cp").args(["-R", &bundle_str, &target_str]),
        "replace_failed",
    ) {
        let _ = Command::new("hdiutil").args(["detach", &volume, "-quiet"]).status();
        return Err(format!("AUTO_REPLACE_FAILED:{e}"));
    }

    let _ = run_checked(
        Command::new("hdiutil").args(["detach", &volume, "-quiet"]),
        "detach_failed",
    );

    emit_progress(&app, "relaunch", 95, "Restarting app...");
    run_checked(
        Command::new("open").arg("/Applications/Macfyi.app"),
        "relaunch_failed",
    )?;
    emit_progress(&app, "done", 100, "Update installed.");
    std::process::exit(0);
}
