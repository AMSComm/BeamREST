# Changelog

All notable changes to **BeamREST** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.1.0] - 2026-10-10

### 🚀 Initial Public Release of BeamREST
- **Ultra-Lightweight & Native Performance**: High-efficiency API development client built with Rust (Tauri v2) and React 19, consuming minimal memory (<40MB idle) compared to bloated Electron-based alternatives.
- **Git-Native File-per-Request Storage**: Hierarchical workspace and project structure saved directly as human-readable JSON files on the filesystem, making version control via Git effortless.
- **Sensitive Variable Security**: Secret variables stored securely in `.secrets.json` isolated from shared project configs, preventing credential leakage in git repositories.
- **Dynamic Variable Substitution & Autocomplete**: Interpolate `{{variable}}` across URL, parameters, headers, and request bodies with real-time autocompletion triggered on `{{`.
- **Automatic Token & JWT Extractors**: Rule-based response interceptor automatically captures JWT tokens or JSON fields and stores them directly into environment or project variables.
- **Live cURL Generation & Parsing**: Automatically generates live cURL commands matching request state and parses pasted `curl` commands directly into requests.
- **Full Postman Collection v2.1 Support**: Seamlessly export workspaces and projects to Postman v2.1 schema with options to include or omit sensitive secrets.
- **Flexible Proxy Support**: Configure HTTP and SOCKS5 proxies per workspace with real-time cURL preview synchronization.
- **Modern Fluid UI**: Precision dark theme with resizable sidebars, split panes, keyboard shortcuts, and built-in in-app auto-update system.
