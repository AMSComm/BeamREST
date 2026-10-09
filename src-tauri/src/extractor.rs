use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ExtractorSource {
    BodyJson,
    Header,
    Regex,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum VariableScope {
    Project,
    Environment,
    Workspace,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractorRule {
    pub id: String,
    pub name: String,
    pub source: ExtractorSource,
    /// Property path for JSON (e.g., "data.token"), Header name (e.g., "Authorization"), or Regex pattern
    pub expression: String,
    pub target_variable: String,
    pub target_scope: VariableScope,
    #[serde(default)]
    pub is_secret: bool,
    #[serde(default = "default_enabled")]
    pub enabled: bool,
}

fn default_enabled() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ExtractedVariable {
    pub key: String,
    pub value: String,
    pub scope: VariableScope,
    pub is_secret: bool,
}

/// Evaluates extraction rules against an HTTP response body and headers.
pub fn evaluate_extractors(
    rules: &[ExtractorRule],
    response_body: &str,
    headers: &[(String, String)],
) -> Vec<ExtractedVariable> {
    let mut extracted = Vec::new();
    let parsed_json: Option<Value> = serde_json::from_str(response_body).ok();

    for rule in rules {
        if !rule.enabled || rule.target_variable.trim().is_empty() {
            continue;
        }

        let extracted_value: Option<String> = match rule.source {
            ExtractorSource::BodyJson => {
                if let Some(ref root) = parsed_json {
                    extract_json_path(root, &rule.expression)
                } else {
                    None
                }
            }
            ExtractorSource::Header => {
                let target_header = rule.expression.trim().to_lowercase();
                headers
                    .iter()
                    .find(|(k, _)| k.to_lowercase() == target_header)
                    .map(|(_, v)| v.clone())
            }
            ExtractorSource::Regex => {
                if let Ok(re) = Regex::new(&rule.expression) {
                    re.captures(response_body).and_then(|caps| {
                        // If there is a capture group, take group 1, otherwise whole match
                        if caps.len() > 1 {
                            caps.get(1).map(|m| m.as_str().to_string())
                        } else {
                            caps.get(0).map(|m| m.as_str().to_string())
                        }
                    })
                } else {
                    None
                }
            }
        };

        if let Some(val) = extracted_value {
            extracted.push(ExtractedVariable {
                key: rule.target_variable.clone(),
                value: val,
                scope: rule.target_scope.clone(),
                is_secret: rule.is_secret,
            });
        }
    }

    extracted
}

/// Extract value from JSON using dot-notation: e.g. "data.user.id" or "tokens[0].access"
fn extract_json_path(root: &Value, path: &str) -> Option<String> {
    let parts: Vec<&str> = path.split('.').map(|s| s.trim()).filter(|s| !s.is_empty()).collect();
    if parts.is_empty() {
        return None;
    }

    let mut current = root;
    for part in parts {
        // Check for array index: "items[0]"
        if let Some(bracket_idx) = part.find('[') {
            let key = &part[..bracket_idx];
            if !key.is_empty() {
                current = current.get(key)?;
            }
            if let Some(end_bracket) = part.find(']') {
                let idx_str = &part[bracket_idx + 1..end_bracket];
                if let Ok(idx) = idx_str.parse::<usize>() {
                    current = current.get(idx)?;
                } else {
                    return None;
                }
            } else {
                return None;
            }
        } else {
            current = current.get(part)?;
        }
    }

    match current {
        Value::String(s) => Some(s.clone()),
        Value::Number(n) => Some(n.to_string()),
        Value::Bool(b) => Some(b.to_string()),
        Value::Null => None,
        other => Some(other.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_json_path_direct_and_nested() {
        let json_str = r#"{
            "status": "success",
            "data": {
                "user": {
                    "id": 101,
                    "token": "jwt-abc-123"
                },
                "roles": ["admin", "editor"]
            }
        }"#;
        let root: Value = serde_json::from_str(json_str).unwrap();

        assert_eq!(extract_json_path(&root, "status"), Some("success".to_string()));
        assert_eq!(extract_json_path(&root, "data.user.token"), Some("jwt-abc-123".to_string()));
        assert_eq!(extract_json_path(&root, "data.user.id"), Some("101".to_string()));
        assert_eq!(extract_json_path(&root, "data.roles[0]"), Some("admin".to_string()));
        assert_eq!(extract_json_path(&root, "data.roles[1]"), Some("editor".to_string()));
        assert_eq!(extract_json_path(&root, "non_existent"), None);
    }

    #[test]
    fn test_evaluate_extractors() {
        let rules = vec![
            ExtractorRule {
                id: "r1".to_string(),
                name: "JWT Token".to_string(),
                source: ExtractorSource::BodyJson,
                expression: "auth.accessToken".to_string(),
                target_variable: "jwt_token".to_string(),
                target_scope: VariableScope::Project,
                is_secret: true,
                enabled: true,
            },
            ExtractorRule {
                id: "r2".to_string(),
                name: "Session Header".to_string(),
                source: ExtractorSource::Header,
                expression: "x-session-id".to_string(),
                target_variable: "session_id".to_string(),
                target_scope: VariableScope::Environment,
                is_secret: false,
                enabled: true,
            },
        ];

        let body = r#"{"auth":{"accessToken":"secret-token-xyz"}}"#;
        let headers = vec![
            ("Content-Type".to_string(), "application/json".to_string()),
            ("X-Session-ID".to_string(), "sess-9999".to_string()),
        ];

        let result = evaluate_extractors(&rules, body, &headers);
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].key, "jwt_token");
        assert_eq!(result[0].value, "secret-token-xyz");
        assert!(result[0].is_secret);

        assert_eq!(result[1].key, "session_id");
        assert_eq!(result[1].value, "sess-9999");
        assert!(!result[1].is_secret);
    }
}
