use std::collections::HashMap;
use std::fs;
use std::path::Path;


use serde::{Deserialize, Serialize};

use crate::http_client::{AuthConfig, BeamRequest};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Variable {
    pub key: String,
    pub value: String,
    #[serde(default)]
    pub is_secret: bool,
    #[serde(default = "default_project_scope")]
    pub scope: String, // "workspace", "environment", "project"
}

fn default_project_scope() -> String {
    "project".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Environment {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub variables: Vec<Variable>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectData {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub auth: Option<AuthConfig>,
    #[serde(default)]
    pub variables: Vec<Variable>,
    #[serde(default)]
    pub requests: Vec<BeamRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceMeta {
    pub id: String,
    pub name: String,
    pub active_environment_id: Option<String>,
    #[serde(default)]
    pub variables: Vec<Variable>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalState {
    pub active_tab_id: Option<String>,
    #[serde(default)]
    pub active_environment_id: Option<String>,
    #[serde(default)]
    pub open_request_ids: Vec<String>,
    #[serde(default)]
    pub collapsed_project_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceFull {
    pub meta: WorkspaceMeta,
    pub path: String,
    pub environments: Vec<Environment>,
    pub projects: Vec<ProjectData>,
    pub local_state: Option<LocalState>,
}

/// Ensures the standard .gitignore exists with rules to prevent committing secret files.
pub fn ensure_gitignore(workspace_dir: &Path) {
    let gitignore_path = workspace_dir.join(".gitignore");
    let rules = "\n# BeamREST Local State & Secret Variables\n*.local.json\nstate.local.json\n.beamrest/state.local.json\n";

    if !gitignore_path.exists() {
        let _ = fs::write(&gitignore_path, rules.trim_start());
    } else if let Ok(existing) = fs::read_to_string(&gitignore_path) {
        if !existing.contains("*.local.json") {
            let mut updated = existing;
            if !updated.ends_with('\n') {
                updated.push('\n');
            }
            updated.push_str(rules);
            let _ = fs::write(&gitignore_path, updated);
        }
    }
}

/// Initializes a new BeamREST workspace in a chosen directory.
pub fn init_workspace(workspace_dir_str: &str, name: &str) -> Result<WorkspaceFull, String> {
    let ws_dir = Path::new(workspace_dir_str);
    if !ws_dir.exists() {
        fs::create_dir_all(ws_dir)
            .map_err(|e| format!("Failed to create workspace directory: {}", e))?;
    }

    let dot_beamrest = ws_dir.join(".beamrest");
    fs::create_dir_all(&dot_beamrest)
        .map_err(|e| format!("Failed to create .beamrest directory: {}", e))?;

    let env_dir = ws_dir.join("environments");
    fs::create_dir_all(&env_dir)
        .map_err(|e| format!("Failed to create environments directory: {}", e))?;

    // Create default project folder
    let default_proj_dir = ws_dir.join("Default-Project");
    fs::create_dir_all(&default_proj_dir)
        .map_err(|e| format!("Failed to create Default-Project directory: {}", e))?;

    let meta = WorkspaceMeta {
        id: uuid::Uuid::new_v4().to_string(),
        name: name.to_string(),
        active_environment_id: None,
        variables: Vec::new(),
    };

    let meta_json = serde_json::to_string_pretty(&meta)
        .map_err(|e| format!("Failed to serialize workspace meta: {}", e))?;
    fs::write(dot_beamrest.join("workspace.json"), meta_json)
        .map_err(|e| format!("Failed to write workspace.json: {}", e))?;

    // Default project definition
    let default_proj = ProjectData {
        id: "proj-default".to_string(),
        name: "Default Project".to_string(),
        description: Some("Initial project collection".to_string()),
        auth: None,
        variables: vec![Variable {
            key: "baseUrl".to_string(),
            value: "https://httpbin.org".to_string(),
            is_secret: false,
            scope: "project".to_string(),
        }],
        requests: vec![BeamRequest {
            id: "req-get-sample".to_string(),
            name: "Sample GET Request".to_string(),
            method: "GET".to_string(),
            url: "{{baseUrl}}/get".to_string(),
            headers: vec![],
            params: vec![],
            body_type: "none".to_string(),
            body_content: "".to_string(),
            auth: None,
            extractors: vec![],
        }],
    };

    save_project(workspace_dir_str, &default_proj)?;
    ensure_gitignore(ws_dir);

    scan_workspace(workspace_dir_str)
}

/// Scans a workspace directory and loads all projects, requests, and environments.
pub fn scan_workspace(workspace_dir_str: &str) -> Result<WorkspaceFull, String> {
    let ws_dir = Path::new(workspace_dir_str);
    if !ws_dir.exists() {
        return Err("Workspace directory does not exist".to_string());
    }

    let dot_beamrest = ws_dir.join(".beamrest");
    let meta_file = dot_beamrest.join("workspace.json");

    let mut meta = if meta_file.exists() {
        let content = fs::read_to_string(&meta_file)
            .map_err(|e| format!("Failed to read workspace.json: {}", e))?;
        serde_json::from_str::<WorkspaceMeta>(&content)
            .unwrap_or_else(|_| WorkspaceMeta {
                id: uuid::Uuid::new_v4().to_string(),
                name: ws_dir
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("Workspace")
                    .to_string(),
                active_environment_id: None,
                variables: Vec::new(),
            })
    } else {
        WorkspaceMeta {
            id: uuid::Uuid::new_v4().to_string(),
            name: ws_dir
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("Workspace")
                .to_string(),
            active_environment_id: None,
            variables: Vec::new(),
        }
    };

    // Load workspace secret variables if present
    let ws_local_file = dot_beamrest.join("workspace.local.json");
    if ws_local_file.exists() {
        if let Ok(local_content) = fs::read_to_string(&ws_local_file) {
            if let Ok(local_vars) = serde_json::from_str::<Vec<Variable>>(&local_content) {
                merge_secret_variables(&mut meta.variables, local_vars);
            }
        }
    }

    // Load local UI state
    let state_file = dot_beamrest.join("state.local.json");
    let local_state = if state_file.exists() {
        fs::read_to_string(&state_file)
            .ok()
            .and_then(|c| serde_json::from_str::<LocalState>(&c).ok())
    } else {
        None
    };

    if let Some(ref ls) = local_state {
        if ls.active_environment_id.is_some() {
            meta.active_environment_id = ls.active_environment_id.clone();
        }
    }

    // Load Environments
    let mut environments = Vec::new();
    let env_dir = ws_dir.join("environments");
    if env_dir.exists() && env_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&env_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let file_name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
                if file_name.ends_with(".env.json") && !file_name.ends_with(".env.local.json") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if let Ok(mut env) = serde_json::from_str::<Environment>(&content) {
                            // Check for corresponding .local.json
                            let local_name = file_name.replace(".env.json", ".env.local.json");
                            let local_path = env_dir.join(local_name);
                            if local_path.exists() {
                                if let Ok(loc_str) = fs::read_to_string(&local_path) {
                                    if let Ok(loc_vars) =
                                        serde_json::from_str::<Vec<Variable>>(&loc_str)
                                    {
                                        merge_secret_variables(&mut env.variables, loc_vars);
                                    }
                                }
                            }
                            environments.push(env);
                        }
                    }
                }
            }
        }
    }

    // Scan Projects
    let mut projects = Vec::new();
    if let Ok(entries) = fs::read_dir(ws_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let dir_name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
                if dir_name.starts_with('.') || dir_name == "environments" {
                    continue;
                }

                // Check for project.json
                let proj_file = path.join("project.json");
                let proj_name = dir_name.to_string();

                let mut project = if proj_file.exists() {
                    let content = fs::read_to_string(&proj_file)
                        .map_err(|e| format!("Failed to read project.json in {}: {}", dir_name, e))?;
                    serde_json::from_str::<ProjectData>(&content).unwrap_or_else(|_| ProjectData {
                        id: uuid::Uuid::new_v4().to_string(),
                        name: proj_name.clone(),
                        description: None,
                        auth: None,
                        variables: Vec::new(),
                        requests: Vec::new(),
                    })
                } else {
                    ProjectData {
                        id: uuid::Uuid::new_v4().to_string(),
                        name: proj_name.clone(),
                        description: None,
                        auth: None,
                        variables: Vec::new(),
                        requests: Vec::new(),
                    }
                };

                // Merge secret variables from project.local.json
                let proj_local_file = path.join("project.local.json");
                if proj_local_file.exists() {
                    if let Ok(local_content) = fs::read_to_string(&proj_local_file) {
                        if let Ok(local_vars) = serde_json::from_str::<Vec<Variable>>(&local_content)
                        {
                            merge_secret_variables(&mut project.variables, local_vars);
                        }
                    }
                }

                // Scan requests in project directory
                let mut requests = Vec::new();
                if let Ok(req_entries) = fs::read_dir(&path) {
                    for req_entry in req_entries.flatten() {
                        let r_path = req_entry.path();
                        let r_name = r_path.file_name().and_then(|s| s.to_str()).unwrap_or("");
                        if r_name.ends_with(".request.json") {
                            if let Ok(req_content) = fs::read_to_string(&r_path) {
                                if let Ok(req) = serde_json::from_str::<BeamRequest>(&req_content) {
                                    requests.push(req);
                                }
                            }
                        }
                    }
                }

                // Sort requests by name
                requests.sort_by(|a, b| a.name.cmp(&b.name));
                project.requests = requests;
                projects.push(project);
            }
        }
    }

    projects.sort_by(|a, b| a.name.cmp(&b.name));
    ensure_gitignore(ws_dir);

    // Validate active_environment_id exists in loaded environments
    if let Some(ref active_id) = meta.active_environment_id {
        if !environments.iter().any(|e| &e.id == active_id) {
            meta.active_environment_id = None;
        }
    }

    Ok(WorkspaceFull {
        meta,
        path: workspace_dir_str.to_string(),
        environments,
        projects,
        local_state,
    })
}

/// Merges secret variables from local file into the base list without overwriting non-secrets.
fn merge_secret_variables(base_vars: &mut Vec<Variable>, local_vars: Vec<Variable>) {
    let mut local_map: HashMap<String, Variable> = local_vars
        .into_iter()
        .map(|v| (v.key.clone(), v))
        .collect();

    for var in base_vars.iter_mut() {
        if let Some(local_var) = local_map.remove(&var.key) {
            var.value = local_var.value;
            var.is_secret = true;
        }
    }

    // Add any extra local secret variables
    for (_, v) in local_map {
        base_vars.push(v);
    }
}

/// Saves a project, automatically splitting secret variables into project.local.json.
pub fn save_project(workspace_dir_str: &str, project: &ProjectData) -> Result<(), String> {
    let ws_dir = Path::new(workspace_dir_str);
    let proj_dir = ws_dir.join(&project.name);
    fs::create_dir_all(&proj_dir)
        .map_err(|e| format!("Failed to create project folder '{}': {}", project.name, e))?;

    // Separate secret variables
    let mut public_vars = Vec::new();
    let mut secret_vars = Vec::new();

    for var in &project.variables {
        if var.is_secret {
            secret_vars.push(var.clone());
            // In public project.json, we keep variable key with empty or masked value
            public_vars.push(Variable {
                key: var.key.clone(),
                value: String::new(),
                is_secret: true,
                scope: var.scope.clone(),
            });
        } else {
            public_vars.push(var.clone());
        }
    }

    let mut public_project = project.clone();
    public_project.variables = public_vars;
    // Don't save full requests list directly inside project.json (file-per-request pattern)
    public_project.requests = Vec::new();

    let json_content = serde_json::to_string_pretty(&public_project)
        .map_err(|e| format!("Failed to serialize project: {}", e))?;
    fs::write(proj_dir.join("project.json"), json_content)
        .map_err(|e| format!("Failed to write project.json: {}", e))?;

    // Secret variables stored in project.local.json (.gitignored)
    let local_path = proj_dir.join("project.local.json");
    if !secret_vars.is_empty() {
        let secret_content = serde_json::to_string_pretty(&secret_vars)
            .map_err(|e| format!("Failed to serialize secret variables: {}", e))?;
        fs::write(&local_path, secret_content)
            .map_err(|e| format!("Failed to write project.local.json: {}", e))?;
    } else if local_path.exists() {
        let _ = fs::remove_file(local_path);
    }

    // Save individual request files
    for req in &project.requests {
        save_request_file(workspace_dir_str, &project.name, req)?;
    }

    ensure_gitignore(ws_dir);
    Ok(())
}

/// Saves an individual request file inside a project folder.
pub fn save_request_file(
    workspace_dir_str: &str,
    project_name: &str,
    request: &BeamRequest,
) -> Result<(), String> {
    let ws_dir = Path::new(workspace_dir_str);
    let proj_dir = ws_dir.join(project_name);
    fs::create_dir_all(&proj_dir)
        .map_err(|e| format!("Failed to ensure project dir '{}': {}", project_name, e))?;

    // Sanitize filename
    let safe_name: String = request
        .name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect();
    let file_name = format!("{}.request.json", safe_name);

    let req_json = serde_json::to_string_pretty(request)
        .map_err(|e| format!("Failed to serialize request: {}", e))?;
    fs::write(proj_dir.join(file_name), req_json)
        .map_err(|e| format!("Failed to write request file: {}", e))?;

    Ok(())
}

/// Deletes a request file.
pub fn delete_request_file(
    workspace_dir_str: &str,
    project_name: &str,
    request_name: &str,
) -> Result<(), String> {
    let ws_dir = Path::new(workspace_dir_str);
    let proj_dir = ws_dir.join(project_name);

    let safe_name: String = request_name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect();
    let file_path = proj_dir.join(format!("{}.request.json", safe_name));

    if file_path.exists() {
        fs::remove_file(file_path).map_err(|e| format!("Failed to delete request file: {}", e))?;
    }
    Ok(())
}

/// Saves an Environment with automatic secret splitting.
pub fn save_environment(workspace_dir_str: &str, env: &Environment) -> Result<(), String> {
    let ws_dir = Path::new(workspace_dir_str);
    let env_dir = ws_dir.join("environments");
    fs::create_dir_all(&env_dir)
        .map_err(|e| format!("Failed to create environments folder: {}", e))?;

    let safe_name: String = env
        .name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect();

    let mut public_vars = Vec::new();
    let mut secret_vars = Vec::new();

    for v in &env.variables {
        if v.is_secret {
            secret_vars.push(v.clone());
            public_vars.push(Variable {
                key: v.key.clone(),
                value: String::new(),
                is_secret: true,
                scope: v.scope.clone(),
            });
        } else {
            public_vars.push(v.clone());
        }
    }

    let mut pub_env = env.clone();
    pub_env.variables = public_vars;

    let env_json = serde_json::to_string_pretty(&pub_env)
        .map_err(|e| format!("Failed to serialize environment: {}", e))?;
    fs::write(env_dir.join(format!("{}.env.json", safe_name)), env_json)
        .map_err(|e| format!("Failed to write environment file: {}", e))?;

    let loc_path = env_dir.join(format!("{}.env.local.json", safe_name));
    if !secret_vars.is_empty() {
        let sec_json = serde_json::to_string_pretty(&secret_vars)
            .map_err(|e| format!("Failed to serialize environment secrets: {}", e))?;
        fs::write(&loc_path, sec_json)
            .map_err(|e| format!("Failed to write environment secrets: {}", e))?;
    } else if loc_path.exists() {
        let _ = fs::remove_file(loc_path);
    }

    ensure_gitignore(ws_dir);
    Ok(())
}

/// Saves local workspace UI state (.beamrest/state.local.json).
pub fn save_local_state(workspace_dir_str: &str, state: &LocalState) -> Result<(), String> {
    let ws_dir = Path::new(workspace_dir_str);
    let dot_beamrest = ws_dir.join(".beamrest");
    fs::create_dir_all(&dot_beamrest)
        .map_err(|e| format!("Failed to create .beamrest directory: {}", e))?;

    let content = serde_json::to_string_pretty(state)
        .map_err(|e| format!("Failed to serialize local state: {}", e))?;
    fs::write(dot_beamrest.join("state.local.json"), content)
        .map_err(|e| format!("Failed to write state.local.json: {}", e))?;

    Ok(())
}

/// Deletes a project folder and all its requests from the workspace.
pub fn delete_project(workspace_dir_str: &str, project_name: &str) -> Result<(), String> {
    let ws_dir = Path::new(workspace_dir_str);
    let proj_dir = ws_dir.join(project_name);
    if proj_dir.exists() && proj_dir.is_dir() {
        fs::remove_dir_all(&proj_dir)
            .map_err(|e| format!("Failed to delete project folder: {}", e))?;
    }
    Ok(())
}

/// Renames a project folder and updates project.json inside it.
pub fn rename_project(
    workspace_dir_str: &str,
    old_name: &str,
    new_name: &str,
) -> Result<(), String> {
    if old_name == new_name {
        return Ok(());
    }

    let ws_dir = Path::new(workspace_dir_str);
    let old_dir = ws_dir.join(old_name);
    let new_dir = ws_dir.join(new_name);

    if !old_dir.exists() {
        return Err(format!("Project directory '{}' does not exist", old_name));
    }
    if new_dir.exists() {
        return Err(format!("A project named '{}' already exists", new_name));
    }

    fs::rename(&old_dir, &new_dir)
        .map_err(|e| format!("Failed to rename project directory: {}", e))?;

    let proj_file = new_dir.join("project.json");
    if proj_file.exists() {
        if let Ok(content) = fs::read_to_string(&proj_file) {
            if let Ok(mut proj) = serde_json::from_str::<ProjectData>(&content) {
                proj.name = new_name.to_string();
                if let Ok(json_content) = serde_json::to_string_pretty(&proj) {
                    let _ = fs::write(&proj_file, json_content);
                }
            }
        }
    }

    Ok(())
}

/// Deletes an environment file and its local secrets file from the workspace.
pub fn delete_environment(workspace_dir_str: &str, env_name: &str) -> Result<(), String> {
    let ws_dir = Path::new(workspace_dir_str);
    let env_dir = ws_dir.join("environments");
    let safe_name: String = env_name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect();

    let pub_file = env_dir.join(format!("{}.env.json", safe_name));
    if pub_file.exists() {
        let _ = fs::remove_file(pub_file);
    }
    let local_file = env_dir.join(format!("{}.env.local.json", safe_name));
    if local_file.exists() {
        let _ = fs::remove_file(local_file);
    }
    Ok(())
}

/// Saves workspace metadata (.beamrest/workspace.json) with secret variable isolation.
pub fn save_workspace_meta(workspace_dir_str: &str, meta: &WorkspaceMeta) -> Result<(), String> {
    let ws_dir = Path::new(workspace_dir_str);
    let dot_beamrest = ws_dir.join(".beamrest");
    fs::create_dir_all(&dot_beamrest).map_err(|e| format!("Failed to create .beamrest: {}", e))?;

    let mut public_vars = Vec::new();
    let mut secret_vars = Vec::new();

    for v in &meta.variables {
        if v.is_secret {
            secret_vars.push(v.clone());
            public_vars.push(Variable {
                key: v.key.clone(),
                value: String::new(),
                is_secret: true,
                scope: v.scope.clone(),
            });
        } else {
            public_vars.push(v.clone());
        }
    }

    let mut pub_meta = meta.clone();
    pub_meta.variables = public_vars;

    let meta_json = serde_json::to_string_pretty(&pub_meta)
        .map_err(|e| format!("Failed to serialize workspace.json: {}", e))?;
    fs::write(dot_beamrest.join("workspace.json"), meta_json)
        .map_err(|e| format!("Failed to write workspace.json: {}", e))?;

    let loc_path = dot_beamrest.join("workspace.local.json");
    if !secret_vars.is_empty() {
        let sec_json = serde_json::to_string_pretty(&secret_vars)
            .map_err(|e| format!("Failed to serialize workspace secrets: {}", e))?;
        fs::write(&loc_path, sec_json)
            .map_err(|e| format!("Failed to write workspace secrets: {}", e))?;
    } else if loc_path.exists() {
        let _ = fs::remove_file(loc_path);
    }

    // Synchronize active_environment_id to state.local.json if local state exists
    let state_file = dot_beamrest.join("state.local.json");
    if state_file.exists() {
        if let Ok(content) = fs::read_to_string(&state_file) {
            if let Ok(mut state) = serde_json::from_str::<LocalState>(&content) {
                state.active_environment_id = meta.active_environment_id.clone();
                let _ = save_local_state(workspace_dir_str, &state);
            }
        }
    }

    ensure_gitignore(ws_dir);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    struct TestDir(PathBuf);
    impl TestDir {
        fn new() -> Self {
            let path = std::env::temp_dir().join(format!("beamrest_test_{}", uuid::Uuid::new_v4()));
            let _ = fs::create_dir_all(&path);
            TestDir(path)
        }
        fn path_str(&self) -> String {
            self.0.to_str().unwrap().to_string()
        }
    }
    impl Drop for TestDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn test_secret_variables_isolation_and_restoration() {
        let td = TestDir::new();
        let ws_path = td.path_str();

        let _ = init_workspace(&ws_path, "Test Workspace").unwrap();

        // 1. Test Project Secret Variables
        let project = ProjectData {
            id: "proj-1".to_string(),
            name: "API Service".to_string(),
            description: None,
            auth: None,
            variables: vec![
                Variable {
                    key: "apiKey".to_string(),
                    value: "super_secret_api_key_999".to_string(),
                    is_secret: true,
                    scope: "project".to_string(),
                },
                Variable {
                    key: "publicHost".to_string(),
                    value: "https://api.example.com".to_string(),
                    is_secret: false,
                    scope: "project".to_string(),
                },
            ],
            requests: vec![],
        };
        save_project(&ws_path, &project).unwrap();

        // Verify public project.json has empty value for secret
        let proj_json_str = fs::read_to_string(td.0.join("API Service").join("project.json")).unwrap();
        let proj_json: serde_json::Value = serde_json::from_str(&proj_json_str).unwrap();
        assert_eq!(proj_json["variables"][0]["value"], "");
        assert_eq!(proj_json["variables"][0]["is_secret"], true);
        assert_eq!(proj_json["variables"][1]["value"], "https://api.example.com");

        // Verify secret project.local.json exists and holds the actual value
        let local_proj_str = fs::read_to_string(td.0.join("API Service").join("project.local.json")).unwrap();
        let local_proj: Vec<Variable> = serde_json::from_str(&local_proj_str).unwrap();
        assert_eq!(local_proj[0].key, "apiKey");
        assert_eq!(local_proj[0].value, "super_secret_api_key_999");

        // 2. Test Environment Secret Variables
        let env = Environment {
            id: "env-prod".to_string(),
            name: "Production".to_string(),
            variables: vec![
                Variable {
                    key: "databasePassword".to_string(),
                    value: "db_pass_12345".to_string(),
                    is_secret: true,
                    scope: "environment".to_string(),
                },
                Variable {
                    key: "region".to_string(),
                    value: "ap-southeast-1".to_string(),
                    is_secret: false,
                    scope: "environment".to_string(),
                },
            ],
        };
        save_environment(&ws_path, &env).unwrap();

        // Verify public env file has empty secret value
        let env_pub_str = fs::read_to_string(td.0.join("environments").join("Production.env.json")).unwrap();
        let env_pub: serde_json::Value = serde_json::from_str(&env_pub_str).unwrap();
        assert_eq!(env_pub["variables"][0]["value"], "");
        assert_eq!(env_pub["variables"][1]["value"], "ap-southeast-1");

        // Verify secret env file has actual secret value
        let env_sec_str = fs::read_to_string(td.0.join("environments").join("Production.env.local.json")).unwrap();
        let env_sec: Vec<Variable> = serde_json::from_str(&env_sec_str).unwrap();
        assert_eq!(env_sec[0].key, "databasePassword");
        assert_eq!(env_sec[0].value, "db_pass_12345");

        // 3. Test Workspace Secret Variables & Active Environment persistence
        let ws_meta = WorkspaceMeta {
            id: "ws-test".to_string(),
            name: "Test Workspace".to_string(),
            active_environment_id: Some("env-prod".to_string()),
            variables: vec![
                Variable {
                    key: "globalToken".to_string(),
                    value: "bearer_xyz_777".to_string(),
                    is_secret: true,
                    scope: "workspace".to_string(),
                },
            ],
        };
        save_workspace_meta(&ws_path, &ws_meta).unwrap();

        // 4. Test Scan Workspace (simulates restarting the app)
        let loaded = scan_workspace(&ws_path).unwrap();

        // Check active_environment_id is restored
        assert_eq!(loaded.meta.active_environment_id, Some("env-prod".to_string()));

        // Check workspace secret variable is restored
        let ws_token_var = loaded.meta.variables.iter().find(|v| v.key == "globalToken").unwrap();
        assert_eq!(ws_token_var.value, "bearer_xyz_777");
        assert!(ws_token_var.is_secret);

        // Check project secret variable is restored
        let loaded_proj = loaded.projects.iter().find(|p| p.name == "API Service").unwrap();
        let api_key_var = loaded_proj.variables.iter().find(|v| v.key == "apiKey").unwrap();
        assert_eq!(api_key_var.value, "super_secret_api_key_999");
        assert!(api_key_var.is_secret);

        // Check environment secret variable is restored
        let loaded_env = loaded.environments.iter().find(|e| e.name == "Production").unwrap();
        let db_pass_var = loaded_env.variables.iter().find(|v| v.key == "databasePassword").unwrap();
        assert_eq!(db_pass_var.value, "db_pass_12345");
        assert!(db_pass_var.is_secret);
    }

    #[test]
    fn test_active_environment_fallback_when_deleted() {
        let td = TestDir::new();
        let ws_path = td.path_str();

        let _ = init_workspace(&ws_path, "Test Workspace").unwrap();

        let ws_meta = WorkspaceMeta {
            id: "ws-test".to_string(),
            name: "Test Workspace".to_string(),
            active_environment_id: Some("non-existent-env-id".to_string()),
            variables: vec![],
        };
        save_workspace_meta(&ws_path, &ws_meta).unwrap();

        let loaded = scan_workspace(&ws_path).unwrap();
        // Since no environment has id "non-existent-env-id", it should fallback to None
        assert_eq!(loaded.meta.active_environment_id, None);
    }

    #[test]
    fn test_rename_project() {
        let td = TestDir::new();
        let ws_path = td.path_str();

        let _ = init_workspace(&ws_path, "Test Workspace").unwrap();

        rename_project(&ws_path, "Default Project", "Renamed Project").unwrap();

        let loaded = scan_workspace(&ws_path).unwrap();
        assert!(loaded.projects.iter().any(|p| p.name == "Renamed Project"));
        assert!(!loaded.projects.iter().any(|p| p.name == "Default Project"));

        rename_project(&ws_path, "Renamed Project", "Renamed Project").unwrap();
        assert!(rename_project(&ws_path, "Non Existent", "New Name").is_err());
    }
}

