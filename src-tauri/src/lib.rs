pub mod cmd;
pub mod download;
pub mod plugin;
pub mod upload;

use cmd::{capture_screen, start_oauth_server, write_clipboard_files};
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let local_data = app.path().app_local_data_dir().map_err(|error| error.to_string())?;
            let plugin_root = local_data.join("plugin-system");
            let db_path = local_data.join("data").join("linyu.db");
            let manager = plugin::PluginManager::initialize(plugin_root, db_path)?;
            app.manage(manager);
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
        .plugin(tauri_plugin_drag::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            capture_screen,
            start_oauth_server,
            write_clipboard_files,
            upload_file_chunks,
            upload_space_file_chunks,
            compute_space_file_hash,
            cancel_space_file_upload,
            download_space_file,
            cancel_space_file_download,
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
            plugin_invoke_api
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
