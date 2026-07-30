pub mod cmd;
pub mod upload;

use cmd::{capture_screen, start_oauth_server, write_clipboard_files};
use upload::{
    cancel_space_file_upload, compute_space_file_hash, upload_file_chunks, upload_space_file_chunks,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
        .invoke_handler(tauri::generate_handler![
            capture_screen,
            start_oauth_server,
            write_clipboard_files,
            upload_file_chunks,
            upload_space_file_chunks,
            compute_space_file_hash,
            cancel_space_file_upload
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
