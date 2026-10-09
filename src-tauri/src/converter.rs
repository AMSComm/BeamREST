use std::collections::HashMap;

use serde_json::{json, Value};

use crate::http_client::{interpolate_variables, AuthConfig, BeamRequest, ProxyConfig};
use crate::storage::{ProjectData, Variable, WorkspaceFull};

/// Generates a standard cURL command from a BeamRequest.
pub fn to_curl(
    request: &BeamRequest,
    variables: &HashMap<String, String>,
    proxy: Option<&ProxyConfig>,
) -> String {
    let mut parts = Vec::new();
    parts.push("curl".to_string());

    // Proxy flag
    if let Some(p) = proxy {
        if p.enabled && !p.url.trim().is_empty() {
            parts.push(format!("-x \"{}\"", p.url.trim()));
        }
    }

    // Method
    let method = request.method.to_uppercase();
    if method != "GET" {
        parts.push(format!("-X {}", method));
    }

    // URL with interpolated variables & query params
    let mut url_str = interpolate_variables(&request.url, variables);
    if !url_str.starts_with("http://") && !url_str.starts_with("https://") {
        url_str = format!("http://{}", url_str);
    }

    // If there are params, append them
    let mut query_parts = Vec::new();
    for p in &request.params {
        if p.enabled && !p.key.trim().is_empty() {
            let val = interpolate_variables(&p.value, variables);
            query_parts.push(format!("{}={}", p.key, val));
        }
    }
    if !query_parts.is_empty() {
        let separator = if url_str.contains('?') { "&" } else { "?" };
        url_str = format!("{}{}{}", url_str, separator, query_parts.join("&"));
    }

    // Headers
    for h in &request.headers {
        if h.enabled && !h.key.trim().is_empty() {
            let val = interpolate_variables(&h.value, variables);
            parts.push(format!("-H \"{}: {}\"", h.key, val));
        }
    }

    // Auth
    if let Some(ref auth) = request.auth {
        match auth {
            AuthConfig::Bearer { token } => {
                let tok = interpolate_variables(token, variables);
                parts.push(format!("-H \"Authorization: Bearer {}\"", tok));
            }
            AuthConfig::Basic { username, password } => {
                let u = interpolate_variables(username, variables);
                let p = interpolate_variables(password, variables);
                parts.push(format!("-u \"{}:{}\"", u, p));
            }
            AuthConfig::ApiKey { key, value, add_to } => {
                let v = interpolate_variables(value, variables);
                if add_to.to_lowercase() == "header" {
                    parts.push(format!("-H \"{}: {}\"", key, v));
                }
            }
            _ => {}
        }
    }

    // Body
    match request.body_type.as_str() {
        "json" | "raw" => {
            if !request.body_content.trim().is_empty() {
                let body = interpolate_variables(&request.body_content, variables);
                let escaped = body.replace('"', "\\\"");
                parts.push(format!("-d \"{}\"", escaped));
            }
        }
        "urlencoded" => {
            if !request.body_content.trim().is_empty() {
                let body = interpolate_variables(&request.body_content, variables);
                parts.push(format!("--data-urlencode \"{}\"", body));
            }
        }
        _ => {}
    }

    // Target URL
    parts.push(format!("\"{}\"", url_str));

    parts.join(" ")
}

/// Converts a BeamRequest into a Postman Collection v2.1 Item JSON object.
fn request_to_postman_item(req: &BeamRequest) -> Value {
    let mut header_list = Vec::new();
    for h in &req.headers {
        if h.enabled {
            header_list.push(json!({
                "key": h.key,
                "value": h.value,
                "type": "text"
            }));
        }
    }

    let url_raw = req.url.clone();
    let url_obj = if let Ok(parsed) = url::Url::parse(&url_raw) {
        let host_parts: Vec<&str> = parsed.host_str().unwrap_or("").split('.').collect();
        let path_parts: Vec<&str> = parsed.path().split('/').filter(|s| !s.is_empty()).collect();
        let query_list: Vec<Value> = req
            .params
            .iter()
            .map(|p| {
                json!({
                    "key": p.key,
                    "value": p.value,
                    "disabled": !p.enabled
                })
            })
            .collect();

        json!({
            "raw": url_raw,
            "protocol": parsed.scheme(),
            "host": host_parts,
            "path": path_parts,
            "query": query_list
        })
    } else {
        json!({
            "raw": url_raw
        })
    };

    let mut body_obj = json!({});
    if req.body_type == "json" {
        body_obj = json!({
            "mode": "raw",
            "raw": req.body_content,
            "options": {
                "raw": {
                    "language": "json"
                }
            }
        });
    } else if req.body_type == "urlencoded" {
        body_obj = json!({
            "mode": "urlencoded",
            "urlencoded": []
        });
    }

    let mut item = json!({
        "name": req.name,
        "request": {
            "method": req.method.to_uppercase(),
            "header": header_list,
            "url": url_obj,
            "body": body_obj
        },
        "response": []
    });

    // Add Auth if specified
    if let Some(ref auth) = req.auth {
        match auth {
            AuthConfig::Bearer { token } => {
                item["request"]["auth"] = json!({
                    "type": "bearer",
                    "bearer": [
                        {
                            "key": "token",
                            "value": token,
                            "type": "string"
                        }
                    ]
                });
            }
            AuthConfig::Basic { username, password } => {
                item["request"]["auth"] = json!({
                    "type": "basic",
                    "basic": [
                        { "key": "username", "value": username, "type": "string" },
                        { "key": "password", "value": password, "type": "string" }
                    ]
                });
            }
            _ => {}
        }
    }

    item
}

/// Formats a list of variables into Postman Collection variables array, filtering secrets if requested.
fn format_postman_variables(vars: &[Variable], include_secrets: bool) -> Vec<Value> {
    vars.iter()
        .map(|v| {
            let val = if v.is_secret && !include_secrets {
                String::new()
            } else {
                v.value.clone()
            };
            json!({
                "key": v.key,
                "value": val,
                "type": if v.is_secret { "secret" } else { "string" }
            })
        })
        .collect()
}

/// Exports a single Project as a standalone Postman Collection v2.1 JSON file.
pub fn export_project_to_postman(project: &ProjectData, include_secrets: bool) -> Value {
    let items: Vec<Value> = project
        .requests
        .iter()
        .map(request_to_postman_item)
        .collect();
    let variables = format_postman_variables(&project.variables, include_secrets);

    json!({
        "info": {
            "_postman_id": project.id,
            "name": project.name,
            "description": project.description.clone().unwrap_or_default(),
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": items,
        "variable": variables
    })
}

/// Exports an entire Workspace as a Postman Collection v2.1 JSON file, with folders for each project.
pub fn export_workspace_to_postman(workspace: &WorkspaceFull, include_secrets: bool) -> Value {
    let mut project_folders = Vec::new();

    for proj in &workspace.projects {
        let items: Vec<Value> = proj.requests.iter().map(request_to_postman_item).collect();
        project_folders.push(json!({
            "name": proj.name,
            "description": proj.description.clone().unwrap_or_default(),
            "item": items
        }));
    }

    let mut all_vars = workspace.meta.variables.clone();
    // Include active environment variables if present
    if let Some(ref env_id) = workspace.meta.active_environment_id {
        if let Some(active_env) = workspace.environments.iter().find(|e| &e.id == env_id) {
            all_vars.extend(active_env.variables.clone());
        }
    }

    let variables = format_postman_variables(&all_vars, include_secrets);

    json!({
        "info": {
            "_postman_id": workspace.meta.id,
            "name": workspace.meta.name,
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": project_folders,
        "variable": variables
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::http_client::KeyValuePair;

    #[test]
    fn test_to_curl_conversion() {
        let req = BeamRequest {
            id: "1".to_string(),
            name: "Get User".to_string(),
            method: "POST".to_string(),
            url: "https://api.example.com/users".to_string(),
            headers: vec![KeyValuePair {
                key: "Content-Type".to_string(),
                value: "application/json".to_string(),
                enabled: true,
                description: None,
            }],
            params: vec![KeyValuePair {
                key: "role".to_string(),
                value: "admin".to_string(),
                enabled: true,
                description: None,
            }],
            body_type: "json".to_string(),
            body_content: r#"{"name":"Alice"}"#.to_string(),
            auth: Some(AuthConfig::Bearer {
                token: "my-token".to_string(),
            }),
            extractors: vec![],
        };

        let vars = HashMap::new();
        let curl = to_curl(&req, &vars, None);

        assert!(curl.contains("-X POST"));
        assert!(curl.contains("-H \"Content-Type: application/json\""));
        assert!(curl.contains("-H \"Authorization: Bearer my-token\""));
        assert!(curl.contains("-d \"{\\\"name\\\":\\\"Alice\\\"}\""));
        assert!(curl.contains("https://api.example.com/users?role=admin"));
    }

    #[test]
    fn test_export_project_secret_filtering() {
        let proj = ProjectData {
            id: "p1".to_string(),
            name: "Auth Service".to_string(),
            description: None,
            auth: None,
            variables: vec![
                Variable {
                    key: "baseUrl".to_string(),
                    value: "https://api.com".to_string(),
                    is_secret: false,
                    scope: "project".to_string(),
                },
                Variable {
                    key: "apiKey".to_string(),
                    value: "super_secret_123".to_string(),
                    is_secret: true,
                    scope: "project".to_string(),
                },
            ],
            requests: vec![],
        };

        // When include_secrets is false, the apiKey value MUST be empty string
        let exported_safe = export_project_to_postman(&proj, false);
        let vars = exported_safe["variable"].as_array().unwrap();
        let api_key_var = vars.iter().find(|v| v["key"] == "apiKey").unwrap();
        assert_eq!(api_key_var["value"], "");

        // When include_secrets is true, the value should be present
        let exported_unmasked = export_project_to_postman(&proj, true);
        let vars_unmasked = exported_unmasked["variable"].as_array().unwrap();
        let api_key_unmasked = vars_unmasked.iter().find(|v| v["key"] == "apiKey").unwrap();
        assert_eq!(api_key_unmasked["value"], "super_secret_123");
    }
}
