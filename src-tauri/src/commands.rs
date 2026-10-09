use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use serde_json::Value;
use tauri::command;

use crate::converter::{export_project_to_postman, export_workspace_to_postman, to_curl};
use crate::http_client::{execute_request, BeamRequest, BeamResponse, ProxyConfig};
use crate::storage::{
    delete_environment, delete_project, delete_request_file, init_workspace, save_environment,
    save_local_state, save_project, save_request_file, save_workspace_meta, scan_workspace,
    Environment, LocalState, ProjectData, WorkspaceFull, WorkspaceMeta,
};

fn get_app_config_dir() -> Option<PathBuf> {
    dirs_next_or_home()
}

fn dirs_next_or_home() -> Option<PathBuf> {
    if let Some(mut home) = dirs_home() {
        home.push(".beamrest_global");
        let _ = fs::create_dir_all(&home);
        Some(home)
    } else {
        None
    }
}

fn dirs_home() -> Option<PathBuf> {
    std::env::var_os("HOME").map(PathBuf::from)
}

#[command]
pub async fn execute_http_request(
    request: BeamRequest,
    variables: HashMap<String, String>,
    proxy: Option<ProxyConfig>,
) -> Result<BeamResponse, String> {
    execute_request(request, &variables, proxy).await
}

#[command]
pub fn open_workspace(path: String) -> Result<WorkspaceFull, String> {
    scan_workspace(&path)
}

#[command]
pub fn create_workspace(path: String, name: String) -> Result<WorkspaceFull, String> {
    init_workspace(&path, &name)
}

#[command]
pub fn save_project_cmd(workspace_path: String, project: ProjectData) -> Result<(), String> {
    save_project(&workspace_path, &project)
}

#[command]
pub fn save_request_cmd(
    workspace_path: String,
    project_name: String,
    request: BeamRequest,
) -> Result<(), String> {
    save_request_file(&workspace_path, &project_name, &request)
}

#[command]
pub fn delete_request_cmd(
    workspace_path: String,
    project_name: String,
    request_name: String,
) -> Result<(), String> {
    delete_request_file(&workspace_path, &project_name, &request_name)
}

#[command]
pub fn delete_project_cmd(workspace_path: String, project_name: String) -> Result<(), String> {
    delete_project(&workspace_path, &project_name)
}

#[command]
pub fn save_environment_cmd(workspace_path: String, env: Environment) -> Result<(), String> {
    save_environment(&workspace_path, &env)
}

#[command]
pub fn delete_environment_cmd(workspace_path: String, env_name: String) -> Result<(), String> {
    delete_environment(&workspace_path, &env_name)
}

#[command]
pub fn save_workspace_meta_cmd(workspace_path: String, meta: WorkspaceMeta) -> Result<(), String> {
    save_workspace_meta(&workspace_path, &meta)
}

#[command]
pub fn save_local_state_cmd(workspace_path: String, state: LocalState) -> Result<(), String> {
    save_local_state(&workspace_path, &state)
}

#[command]
pub fn generate_curl_cmd(
    request: BeamRequest,
    variables: HashMap<String, String>,
    proxy: Option<ProxyConfig>,
) -> Result<String, String> {
    Ok(to_curl(&request, &variables, proxy.as_ref()))
}

#[command]
pub fn export_postman_cmd(
    scope: String, // "project" or "workspace"
    payload: Value,
    include_secrets: bool,
) -> Result<String, String> {
    if scope == "project" {
        let proj: ProjectData = serde_json::from_value(payload)
            .map_err(|e| format!("Failed to parse project for export: {}", e))?;
        let postman_json = export_project_to_postman(&proj, include_secrets);
        serde_json::to_string_pretty(&postman_json)
            .map_err(|e| format!("Serialization error: {}", e))
    } else {
        let ws: WorkspaceFull = serde_json::from_value(payload)
            .map_err(|e| format!("Failed to parse workspace for export: {}", e))?;
        let postman_json = export_workspace_to_postman(&ws, include_secrets);
        serde_json::to_string_pretty(&postman_json)
            .map_err(|e| format!("Serialization error: {}", e))
    }
}

#[command]
pub fn get_last_workspace_path() -> Result<Option<String>, String> {
    if let Some(cfg) = get_app_config_dir() {
        let file = cfg.join("last_workspace.txt");
        if file.exists() {
            if let Ok(path) = fs::read_to_string(file) {
                let trimmed = path.trim().to_string();
                if !trimmed.is_empty() && PathBuf::from(&trimmed).exists() {
                    return Ok(Some(trimmed));
                }
            }
        }
    }
    Ok(None)
}

#[command]
pub fn save_last_workspace_path(path: String) -> Result<(), String> {
    if let Some(cfg) = get_app_config_dir() {
        let file = cfg.join("last_workspace.txt");
        let _ = fs::write(file, path);
    }
    Ok(())
}
