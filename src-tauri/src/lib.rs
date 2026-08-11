pub mod app_update;
pub mod cmd;
pub mod download;
pub mod plugin;
pub mod upload;
pub mod work;

use app_update::{
    cancel_app_update_download, download_app_update, install_app_update, AppUpdateState,
};
use cmd::{capture_screen, show_app_notification, start_oauth_server, write_clipboard_files};
use download::{cancel_space_file_download, download_space_file};
use plugin::commands::{
    plugin_abort_install, plugin_commit_install, plugin_export_development, plugin_get_system_info,
    plugin_invoke_api, plugin_prepare_development, plugin_prepare_local, plugin_prepare_remote,
    plugin_read_entry, plugin_set_enabled, plugin_uninstall,
};
use tauri::Manager;
use upload::{
    cancel_space_file_upload, compute_space_file_hash, upload_file_chunks, upload_space_file_chunks,
};
use work::commands::{
    work_preferences_get, work_preferences_save, work_provider_delete, work_provider_list,
    work_provider_save, work_provider_test, work_runtime_check_update, work_runtime_detect,
    work_runtime_install, work_runtime_list, work_session_cancel, work_session_close,
    work_session_new, work_session_prompt, work_session_resolve_permission,
    work_session_set_config, work_skill_install, work_skill_local_state, work_skill_set_enabled,
    work_skill_uninstall, work_status,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let focus_label =
                if app.get_webview_window("home").is_some() { "home" } else { "login" };
            if let Some(window) = app.get_webview_window(focus_label) {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            let local_data = app.path().app_local_data_dir().map_err(|error| error.to_string())?;
            let plugin_root = local_data.join("plugin-system");
            let db_path = local_data.join("data").join("linyu.db");
            let manager = plugin::PluginManager::initialize(plugin_root, db_path)?;
            app.manage(manager);
            let work_manager = work::WorkManager::initialize(local_data.join("work-assistant"))?;
            app.manage(work_manager);
            app.manage(AppUpdateState::default());
            Ok(())
        })
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_fs::init())
        .manage(cmd::OauthServerState::default())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_drag::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            capture_screen,
            start_oauth_server,
            write_clipboard_files,
            show_app_notification,
            upload_file_chunks,
            upload_space_file_chunks,
            compute_space_file_hash,
            cancel_space_file_upload,
            download_space_file,
            cancel_space_file_download,
            download_app_update,
            cancel_app_update_download,
            install_app_update,
            plugin_get_system_info,
            plugin_prepare_remote,
            plugin_prepare_local,
            plugin_prepare_development,
            plugin_export_development,
            plugin_abort_install,
            plugin_commit_install,
            plugin_uninstall,
            plugin_set_enabled,
            plugin_read_entry,
            plugin_invoke_api,
            work_runtime_list,
            work_runtime_detect,
            work_runtime_check_update,
            work_runtime_install,
            work_provider_list,
            work_preferences_get,
            work_preferences_save,
            work_provider_save,
            work_provider_test,
            work_provider_delete,
            work_skill_local_state,
            work_skill_install,
            work_skill_uninstall,
            work_skill_set_enabled,
            work_session_new,
            work_session_prompt,
            work_session_cancel,
            work_session_close,
            work_session_set_config,
            work_session_resolve_permission,
            work_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
