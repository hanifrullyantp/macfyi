use crate::ai::model_manager;
use crate::ai::state::{AiState, ModelId};
use crate::ai::runtime::RuntimeStatusDto;
use serde::{Deserialize, Serialize};
use std::sync::{
    atomic::AtomicBool,
    Arc,
};
use std::time::Duration;
use tauri::Manager;
use tauri::State;
use sysinfo::{MemoryRefreshKind, RefreshKind, System};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiStatusDto {
    pub enabled: bool,
    pub selected_model: String,
    pub lite_installed: bool,
    pub better_installed: bool,
    pub download_in_progress: bool,
    pub panel_open: bool,
  pub memory_pressure_high: bool,
}

#[tauri::command]
pub fn ai_status(state: State<'_, AiState>) -> Result<AiStatusDto, String> {
    let enabled = *state.enabled.lock().unwrap();
    let selected = state.selected_model.lock().unwrap().as_str().to_string();
    let downloading = state.download_cancel.lock().unwrap().is_some();
    let panel_open = *state.panel_open.lock().unwrap();
    let pressure_high = *state.memory_pressure_high.lock().unwrap();

    let cat = model_manager::load_catalog()?;
    let lite = cat
        .models
        .get("lite")
        .ok_or_else(|| "models.json missing 'lite'".to_string())?;
    let better = cat
        .models
        .get("better")
        .ok_or_else(|| "models.json missing 'better'".to_string())?;

    Ok(AiStatusDto {
        enabled,
        selected_model: selected,
        lite_installed: model_manager::is_model_installed(lite).unwrap_or(false),
        better_installed: model_manager::is_model_installed(better).unwrap_or(false),
        download_in_progress: downloading,
        panel_open,
        memory_pressure_high: pressure_high,
    })
}

fn compute_memory_pressure_high() -> bool {
    let mut sys = System::new_with_specifics(
        RefreshKind::nothing().with_memory(MemoryRefreshKind::everything()),
    );
    sys.refresh_memory();
    let total = sys.total_memory();
    let avail = sys.available_memory();
    if total == 0 {
        return false;
    }
    // Heuristic thresholds:
    // - under ~1.5 GB available OR
    // - under 15% available
    let avail_gb = avail as f64 / (1024.0 * 1024.0 * 1024.0);
    let pct = (avail as f64 / total as f64) * 100.0;
    avail_gb < 1.5 || pct < 15.0
}

#[tauri::command]
pub fn ai_enable(state: State<'_, AiState>, enabled: bool) -> Result<(), String> {
    *state.enabled.lock().unwrap() = enabled;
    Ok(())
}

#[tauri::command]
pub fn ai_set_model(state: State<'_, AiState>, model_id: String) -> Result<(), String> {
    let m = ModelId::try_from(model_id)?;
    *state.selected_model.lock().unwrap() = m;
    Ok(())
}

#[tauri::command]
pub async fn ai_download_model(
    app: tauri::AppHandle,
    state: State<'_, AiState>,
    model_id: String,
) -> Result<(), String> {
    let m = ModelId::try_from(model_id)?;
    let catalog = model_manager::load_catalog()?;
    let spec = catalog
        .models
        .get(m.as_str())
        .ok_or_else(|| "Unknown model spec".to_string())?
        .clone();

    // Prevent parallel downloads.
    {
        let mut g = state.download_cancel.lock().unwrap();
        if g.is_some() {
            return Err("Download already in progress.".to_string());
        }
        *g = Some(Arc::new(AtomicBool::new(false)));
    }

    let cancel = state.download_cancel.lock().unwrap().as_ref().unwrap().clone();
    let res = model_manager::download_model(&app, &spec, cancel.clone()).await;

    // Clear download flag.
    {
        let mut g = state.download_cancel.lock().unwrap();
        g.take();
    }

    res
}

#[tauri::command]
pub fn ai_cancel_download(state: State<'_, AiState>) -> Result<(), String> {
    if state.cancel_download() {
        Ok(())
    } else {
        Err("No download in progress.".to_string())
    }
}

#[tauri::command]
pub fn ai_delete_model(state: State<'_, AiState>, model_id: Option<String>) -> Result<(), String> {
    // Cancel any download before delete to avoid partials.
    let _ = state.cancel_download();
    let catalog = model_manager::load_catalog()?;

    let ids: Vec<String> = if let Some(mid) = model_id {
        vec![mid]
    } else {
        vec!["lite".to_string(), "better".to_string()]
    };

    for id in ids {
        let spec = catalog
            .models
            .get(id.as_str())
            .ok_or_else(|| format!("Unknown modelId: {id}"))?;
        model_manager::delete_model_files(spec)?;
    }

    Ok(())
}

#[tauri::command]
pub async fn ai_open_panel(app: tauri::AppHandle, state: State<'_, AiState>) -> Result<(), String> {
    *state.panel_open.lock().unwrap() = true;

    // Memory pressure guard (only checked while panel opens / is active)
    {
        let high = compute_memory_pressure_high();
        *state.memory_pressure_high.lock().unwrap() = high;
        if high {
            let mut rt = state.runtime.lock().await;
            rt.unload();
            // Do NOT force-load under pressure; UI should fallback to KB.
            return Ok(());
        }
    }

    // Start idle watcher (only once).
    {
        let mut running = state.idle_task_running.lock().unwrap();
        if !*running {
            *running = true;
            let app2 = app.clone();
            // We can't move State into task; re-access via app state handle.
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(Duration::from_secs(15)).await;
                    if let Some(st) = app2.try_state::<AiState>() {
                        let panel_open = *st.panel_open.lock().unwrap();
                        let mut rt = st.runtime.lock().await;
                        // Unload after 3 minutes idle if panel is open but inactive.
                        if panel_open && rt.should_unload_idle(Duration::from_secs(180)) {
                            rt.unload();
                        }
                        // If panel is closed, unload after 3 minutes as well and stop loop.
                        if !panel_open {
                            if rt.should_unload_idle(Duration::from_secs(180)) {
                                rt.unload();
                            }
                            *st.idle_task_running.lock().unwrap() = false;
                            break;
                        }
                    } else {
                        break;
                    }
                }
            });
        }
    }

    // Load runtime on-demand only if enabled.
    let enabled = *state.enabled.lock().unwrap();
    if enabled {
        let model_id = state.selected_model.lock().unwrap().as_str().to_string();
        let mut rt = state.runtime.lock().await;
        rt.load_if_needed(&app, &model_id).await?;
    }
    Ok(())
}

#[tauri::command]
pub fn ai_close_panel(state: State<'_, AiState>) -> Result<(), String> {
    *state.panel_open.lock().unwrap() = false;
    Ok(())
}

#[tauri::command]
pub async fn ai_cancel_generation(state: State<'_, AiState>) -> Result<(), String> {
    let mut rt = state.runtime.lock().await;
    rt.cancel_generation();
    Ok(())
}

#[tauri::command]
pub async fn ai_runtime_status(state: State<'_, AiState>) -> Result<RuntimeStatusDto, String> {
    let rt = state.runtime.lock().await;
    Ok(rt.status())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiGenerateDto {
    pub question_type: String,
    pub custom_question: Option<String>,
    pub item_context: serde_json::Value,
}

#[tauri::command]
pub async fn ai_generate(
    app: tauri::AppHandle,
    state: State<'_, AiState>,
    request: AiGenerateDto,
) -> Result<(), String> {
    // Only respond when user explicitly asks. No background work.
    if !*state.enabled.lock().unwrap() {
        return Err("AI is disabled.".to_string());
    }

    // Re-check memory pressure just-in-time.
    {
        let high = compute_memory_pressure_high();
        *state.memory_pressure_high.lock().unwrap() = high;
        if high {
            let mut rt = state.runtime.lock().await;
            rt.unload();
            return Err("memory_pressure".to_string());
        }
    }

    let model_id = state.selected_model.lock().unwrap().as_str().to_string();

    // Map question types.
    let question = match request.question_type.as_str() {
        "custom" => request
            .custom_question
            .unwrap_or_else(|| "Jelaskan dengan aman.".to_string()),
        "what_is_this" => "Apa ini?".to_string(),
        "why_recommended" => "Kenapa disarankan?".to_string(),
        "is_it_safe" => "Aman dibersihkan?".to_string(),
        "impact" => "Apa dampaknya?".to_string(),
        _ => "Jelaskan dengan aman.".to_string(),
    };

    // Conservative output size: 150–300 kata ~ 220-320 tokens-ish in Indonesian.
    let n_predict = if model_id == "better" { 360 } else { 280 };

    let mut rt = state.runtime.lock().await;
    rt.load_if_needed(&app, &model_id).await?;
    rt.generate_stream(&app, &question, request.item_context, n_predict).await
}

