mod path_taxonomy;
mod commands;

use commands::disk_surge::{spawn_disk_surge_monitor, DiskSurgeState};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(DiskSurgeState::default())
    .setup(|app| {
      app.handle().plugin(tauri_plugin_dialog::init())?;
      app.handle().plugin(tauri_plugin_notification::init())?;
      app.handle().plugin(tauri_plugin_deep_link::init())?;
      #[cfg(desktop)]
      {
        app.handle().plugin(tauri_plugin_process::init())?;
        let handle = app.handle().clone();
        let surge = app.state::<DiskSurgeState>().inner().clone();
        spawn_disk_surge_monitor(handle, surge);
      }
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
      commands::disk_explorer::check_full_disk_access,
      commands::disk_explorer::open_fda_system_settings,
      commands::disk_explorer::scan_disk_level,
      commands::disk_explorer::disk_explorer_volume_stats,
      commands::disk_explorer::move_node_to_trash,
      commands::disk_explorer::get_node_file_list,
      commands::disk_explorer::export_scan_report,
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
      commands::disk_surge::analyze_disk_surge,
      commands::disk_surge::surge_trash_safe_cache_paths,
      commands::performance::get_memory_snapshot,
      commands::performance::get_top_processes,
      commands::performance::list_launch_agents,
      commands::performance::run_maintenance,
      commands::performance::open_login_items_settings,
      commands::performance::force_close_process,
      commands::license::get_device_fingerprint,
      commands::license::activate_license,
      commands::update::get_app_version,
      commands::update::get_platform,
      commands::update::download_and_install_update,
      commands::onboarding::onboarding_sync,
      commands::onboarding::onboarding_set_completed,
      commands::onboarding::onboarding_reset,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
