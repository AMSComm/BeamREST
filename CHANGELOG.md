# Changelog

All notable changes to **BeamREST** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.1.1] - 2026-10-12

### Fixed
- **Secret Variable Persistence**: Restored dual-tier secret isolation storage across Projects, Environments, and Workspaces. Secret values are safely persisted into `.local.json` files (`project.local.json`, `<env>.env.local.json`, `.beamrest/workspace.local.json`), preventing credential loss upon app restarts while keeping Git commits secret-free.
- **Active Environment Retention**: Workspaces now automatically persist the selected active environment in `.beamrest/workspace.json` and sync with `.beamrest/state.local.json`, cleanly restoring the user's chosen environment on app launch.
- **Safe Environment Fallback**: Added validation during workspace scanning to gracefully reset active environment if a deleted environment ID was previously referenced.

### Internal
- Added automated Rust storage tests verifying secret variable isolation and active environment restoration.
- Added frontend store unit tests for active environment lifecycle and variable resolution.

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
