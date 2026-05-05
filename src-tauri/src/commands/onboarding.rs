use serde::{Deserialize, Serialize};
use std::fs;
use tauri::AppHandle;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
struct OnboardingStored {
    done: bool,
    version: i32,
}

#[derive(Debug, Serialize)]
pub struct OnboardingSyncResult {
    pub should_show: bool,
}

fn onboarding_file(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())
        .map(|p| p.join("onboarding_state.json"))
}

/// Persists onboarding completion beside WKWebView `localStorage` (reliable after install/update).
#[tauri::command]
pub fn onboarding_sync(
    app: AppHandle,
    local_completed: bool,
    local_version: i32,
    expected_version: i32,
) -> Result<OnboardingSyncResult, String> {
    let path = onboarding_file(&app)?;
    let (done, stored_v) = if path.exists() {
        let txt = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let st: OnboardingStored =
            serde_json::from_str(&txt).map_err(|e| e.to_string())?;
        (st.done, st.version)
    } else {
        let migrated = local_completed && local_version == expected_version;
        let version = if migrated {
            expected_version
        } else {
            local_version
        };
        let fresh = OnboardingStored {
            done: migrated,
            version,
        };
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::write(
            &path,
            serde_json::to_vec_pretty(&fresh).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
        (fresh.done, fresh.version)
    };

    let completed = done && stored_v == expected_version;
    Ok(OnboardingSyncResult {
        should_show: !completed,
    })
}

#[tauri::command]
pub fn onboarding_set_completed(app: AppHandle, version: i32) -> Result<(), String> {
    let path = onboarding_file(&app)?;
    let st = OnboardingStored {
        done: true,
        version,
    };
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(
        &path,
        serde_json::to_vec_pretty(&st).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn onboarding_reset(app: AppHandle) -> Result<(), String> {
    let path = onboarding_file(&app)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
