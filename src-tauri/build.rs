fn main() {
    const COMMANDS: &[&str] = &[
        "capture_screen",
        "start_oauth_server",
        "write_clipboard_files",
        "upload_file_chunks",
        "upload_space_file_chunks",
        "compute_space_file_hash",
        "cancel_space_file_upload",
        "download_space_file",
        "cancel_space_file_download",
        "plugin_get_system_info",
        "plugin_prepare_remote",
        "plugin_prepare_local",
        "plugin_prepare_development",
        "plugin_export_development",
        "plugin_abort_install",
        "plugin_commit_install",
        "plugin_uninstall",
        "plugin_set_enabled",
        "plugin_read_entry",
        "plugin_invoke_api",
    ];

    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)),
    )
    .expect("failed to run tauri build script")
}
