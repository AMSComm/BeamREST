# Changelog

All notable changes to **BeamREST** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.1.5] - 2026-10-12

### Fixed
- **Dynamic Version Discovery**: Fixed update dialog and header dropdown rendering a stale hardcoded version by dynamically reading the actual version at build time from `package.json` (`__APP_VERSION__`) and at runtime via Tauri core binary inspection (`get_app_version_cmd`).
- **Reliable In-App Auto-Update Restart**: Resolved macOS process restart suspension after updating. Added native operating system process relaunch command `restart_app_cmd` utilizing `tauri::process::restart` and added a prominent "Restart Now" button on the update dialog for immediate application restart.

## [v0.1.4] - 2026-10-12

### Added
- **Request Cloning / Duplicating**: Added full request duplication capability accessible via the new Clone button in the RequestPane header, hover action in the Sidebar, and `⌘ D` / `Ctrl+D` keyboard shortcut.
- **Deterministic Clone Naming**: Automatically appends sequential copy counters (`[Name] (Copy)`, `[Name] (Copy 2)`) with case-insensitive collision detection to guarantee safe filesystem persistence.
- **Deep Configuration Copy**: Clones all headers, query parameters, body data, and authentication rules. Response extractors receive fresh unique IDs to isolate token capture rules between original and duplicate requests.
- **Immediate Selection & Disk Sync**: Cloned requests are directly saved to disk as `{clone_name}.request.json`, immediately selected as the active request in the workspace, and registered in the Recent Requests history.

## [v0.1.3] - 2026-10-12

### Added
- **Recent Requests Section**: Added a dedicated, persistent Recent Requests panel located directly below the project list in the sidebar. Displays HTTP method badges, request name, and parent project with one-click navigation and an instant history clear action.
- **Request Renaming**: Added inline request renaming support both in the RequestPane header and Sidebar via double-click or the edit action button, automatically updating filesystem storage and active tabs.
- **Project Renaming**: Added project renaming directly in the Sidebar with disk directory renaming, internal `project.json` synchronization, and duplicate project name validation while safely preserving all child requests and secrets.

### Improved
- **Multi-Tier Persistence**: Enhanced workspace local state (`state.local.json`) and localStorage caching to guarantee recent requests, active environments, and workspace configurations are preserved across application restarts.

## [v0.1.2] - 2026-10-12

### Fixed
- **In-App Auto-Update Artifacts**: Enabled `createUpdaterArtifacts` in Tauri bundle configuration to generate `latest.json` and cryptographic `.sig` files on release builds, allowing native in-app updates with 1-click install and restart.
- **Dynamic Version Synchronization**: Synchronized application version across manifest files and updated the Header component to dynamically render the current version.

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
