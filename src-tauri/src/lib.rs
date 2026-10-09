pub mod commands;
pub mod converter;
pub mod extractor;
pub mod http_client;
pub mod storage;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            execute_http_request,
            open_workspace,
            create_workspace,
            save_project_cmd,
            delete_project_cmd,
            save_request_cmd,
            delete_request_cmd,
            save_environment_cmd,
            delete_environment_cmd,
            save_workspace_meta_cmd,
            save_local_state_cmd,
            generate_curl_cmd,
            export_postman_cmd,
            get_last_workspace_path,
            save_last_workspace_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running BeamREST application");
}
