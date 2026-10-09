use std::collections::HashMap;
use std::time::Instant;

use chrono::Utc;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::{Client, Method};
use serde::{Deserialize, Serialize};

use crate::extractor::{evaluate_extractors, ExtractedVariable, ExtractorRule};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyValuePair {
    pub key: String,
    pub value: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub description: Option<String>,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum AuthConfig {
    None,
    Inherit,
    Bearer {
        token: String,
    },
    Basic {
        username: String,
        password: String,
    },
    ApiKey {
        key: String,
        value: String,
        #[serde(rename = "addTo")]
        add_to: String, // "header" or "query"
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeamRequest {
    pub id: String,
    pub name: String,
    pub method: String,
    pub url: String,
    #[serde(default)]
    pub headers: Vec<KeyValuePair>,
    #[serde(default)]
    pub params: Vec<KeyValuePair>,
    #[serde(default = "default_body_type")]
    pub body_type: String, // "none", "json", "urlencoded", "raw"
    #[serde(default)]
    pub body_content: String,
    pub auth: Option<AuthConfig>,
    #[serde(default)]
    pub extractors: Vec<ExtractorRule>,
}

fn default_body_type() -> String {
    "none".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProxyConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub url: String, // e.g. "http://127.0.0.1:8080" or "socks5://127.0.0.1:1080"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeamResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: Vec<KeyValuePair>,
    pub body: String,
    pub size_bytes: usize,
    pub latency_ms: u64,
    pub timestamp: String,
    pub extracted_variables: Vec<ExtractedVariable>,
}

/// Interpolates template variables `{{key}}` using the provided environment map.
pub fn interpolate_variables(input: &str, variables: &HashMap<String, String>) -> String {
    let mut result = input.to_string();
    for (key, val) in variables {
        let pattern = format!("{{{{{}}}}}", key);
        result = result.replace(&pattern, val);
    }
    result
}

/// Executes an HTTP request with timing, proxy support, and extractor evaluation.
pub async fn execute_request(
    request: BeamRequest,
    variables: &HashMap<String, String>,
    proxy_config: Option<ProxyConfig>,
) -> Result<BeamResponse, String> {
    let mut client_builder = Client::builder()
        .timeout(std::time::Duration::from_secs(60));

    if let Some(ref proxy) = proxy_config {
        if proxy.enabled && !proxy.url.trim().is_empty() {
            let proxy_obj = reqwest::Proxy::all(&proxy.url)
                .map_err(|e| format!("Invalid proxy configuration '{}': {}", proxy.url, e))?;
            client_builder = client_builder.proxy(proxy_obj);
        }
    }

    let client = client_builder
        .build()
        .map_err(|e| format!("Failed to initialize HTTP client: {}", e))?;

    // 1. Interpolate URL and query parameters
    let mut raw_url = interpolate_variables(&request.url, variables);
    if !raw_url.starts_with("http://") && !raw_url.starts_with("https://") {
        raw_url = format!("http://{}", raw_url);
    }

    let mut url = reqwest::Url::parse(&raw_url)
        .map_err(|e| format!("Invalid URL '{}': {}", raw_url, e))?;

    // Append active query parameters
    {
        let mut query_pairs = url.query_pairs_mut();
        for param in &request.params {
            if param.enabled && !param.key.trim().is_empty() {
                let interpolated_val = interpolate_variables(&param.value, variables);
                query_pairs.append_pair(&param.key, &interpolated_val);
            }
        }
    }

    // 2. Determine Method
    let method = match request.method.to_uppercase().as_str() {
        "GET" => Method::GET,
        "POST" => Method::POST,
        "PUT" => Method::PUT,
        "DELETE" => Method::DELETE,
        "PATCH" => Method::PATCH,
        "HEAD" => Method::HEAD,
        "OPTIONS" => Method::OPTIONS,
        other => Method::from_bytes(other.as_bytes())
            .map_err(|_| format!("Unsupported HTTP method: {}", other))?,
    };

    let mut req_builder = client.request(method, url);

    // 3. Build Headers
    let mut header_map = HeaderMap::new();
    for h in &request.headers {
        if h.enabled && !h.key.trim().is_empty() {
            let key_str = h.key.trim();
            let val_str = interpolate_variables(&h.value, variables);
            if let (Ok(h_name), Ok(h_val)) = (
                HeaderName::from_bytes(key_str.as_bytes()),
                HeaderValue::from_str(&val_str),
            ) {
                header_map.insert(h_name, h_val);
            }
        }
    }

    // 4. Handle Authentication
    if let Some(ref auth) = request.auth {
        match auth {
            AuthConfig::Bearer { token } => {
                let resolved_token = interpolate_variables(token, variables);
                if let Ok(val) = HeaderValue::from_str(&format!("Bearer {}", resolved_token)) {
                    header_map.insert(reqwest::header::AUTHORIZATION, val);
                }
            }
            AuthConfig::Basic { username, password } => {
                let res_user = interpolate_variables(username, variables);
                let res_pass = interpolate_variables(password, variables);
                req_builder = req_builder.basic_auth(res_user, Some(res_pass));
            }
            AuthConfig::ApiKey { key, value, add_to } => {
                let res_val = interpolate_variables(value, variables);
                if add_to.to_lowercase() == "header" {
                    if let (Ok(h_name), Ok(h_val)) = (
                        HeaderName::from_bytes(key.as_bytes()),
                        HeaderValue::from_str(&res_val),
                    ) {
                        header_map.insert(h_name, h_val);
                    }
                }
            }
            _ => {}
        }
    }

    req_builder = req_builder.headers(header_map);

    // 5. Handle Body
    match request.body_type.as_str() {
        "json" | "raw" => {
            if !request.body_content.is_empty() {
                let interpolated_body = interpolate_variables(&request.body_content, variables);
                req_builder = req_builder.body(interpolated_body);
            }
        }
        "urlencoded" => {
            if !request.body_content.is_empty() {
                let interpolated_body = interpolate_variables(&request.body_content, variables);
                req_builder = req_builder
                    .header(reqwest::header::CONTENT_TYPE, "application/x-www-form-urlencoded")
                    .body(interpolated_body);
            }
        }
        _ => {}
    }

    // 6. Send request and measure latency
    let start_instant = Instant::now();
    let res = req_builder
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;
    let latency_ms = start_instant.elapsed().as_millis() as u64;

    let status = res.status().as_u16();
    let status_text = res
        .status()
        .canonical_reason()
        .unwrap_or("Unknown")
        .to_string();

    // Collect response headers
    let mut response_headers = Vec::new();
    let mut raw_headers_for_extractor = Vec::new();
    for (k, v) in res.headers() {
        let val_str = v.to_str().unwrap_or("").to_string();
        response_headers.push(KeyValuePair {
            key: k.as_str().to_string(),
            value: val_str.clone(),
            enabled: true,
            description: None,
        });
        raw_headers_for_extractor.push((k.as_str().to_string(), val_str));
    }

    let response_body = res
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    let size_bytes = response_body.as_bytes().len();

    // 7. Evaluate declarative extractors
    let extracted_variables = evaluate_extractors(
        &request.extractors,
        &response_body,
        &raw_headers_for_extractor,
    );

    Ok(BeamResponse {
        status,
        status_text,
        headers: response_headers,
        body: response_body,
        size_bytes,
        latency_ms,
        timestamp: Utc::now().to_rfc3339(),
        extracted_variables,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_interpolate_variables() {
        let mut vars = HashMap::new();
        vars.insert("baseUrl".to_string(), "https://api.example.com".to_string());
        vars.insert("userId".to_string(), "42".to_string());

        let url = "{{baseUrl}}/users/{{userId}}/profile";
        let interpolated = interpolate_variables(url, &vars);
        assert_eq!(interpolated, "https://api.example.com/users/42/profile");
    }
}
