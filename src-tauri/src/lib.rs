mod commands;
mod ai;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      app.manage(crate::ai::state::AiState::default());
      app.handle().plugin(tauri_plugin_dialog::init())?;
      app.handle().plugin(tauri_plugin_notification::init())?;
      app.handle().plugin(tauri_plugin_deep_link::init())?;
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::storage::get_disk_stats,
      commands::storage::storage_breakdown,
      commands::scan::deep_scan,
      commands::scan::cancel_scan,
      commands::apps::app_audit,
      commands::apps::orphan_detect,
      commands::shell_probe::shell_probe,
      commands::preview::file_preview,
      commands::preview::reveal_in_finder,
      commands::trash::move_paths_to_trash,
      commands::trash::delete_paths_permanently,
      commands::trash::open_user_trash,
      commands::trash::list_trash_items,
      commands::trash::empty_trash,
      commands::uninstaller::list_uninstall_apps,
      commands::uninstaller::uninstall_app_bundle,
      commands::uninstaller::remove_orphan_paths,
      commands::performance::get_memory_snapshot,
      commands::performance::get_top_processes,
      commands::performance::list_launch_agents,
      commands::performance::run_maintenance,
      commands::performance::open_login_items_settings,
      commands::performance::force_close_process,
      commands::license::get_device_fingerprint,
      commands::license::activate_license,
      commands::ai::ai_status,
      commands::ai::ai_enable,
      commands::ai::ai_set_model,
      commands::ai::ai_download_model,
      commands::ai::ai_cancel_download,
      commands::ai::ai_delete_model,
      commands::ai::ai_open_panel,
      commands::ai::ai_close_panel,
      commands::ai::ai_runtime_status,
      commands::ai::ai_generate,
      commands::ai::ai_cancel_generation,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
