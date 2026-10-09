# BeamREST ⚡

> **Ultra-Lightweight, High-Performance REST Client Suite for macOS & Cross-Platform**  
> *Developed by AM Software (https://amsoftware.com.vn)*

---

## 🚀 Overview

**BeamREST** is a blazing-fast, resource-efficient API client designed to replace bloated Electron-based tools like Postman. It delivers instant cold startup (< 250ms), minimal idle memory footprint (< 45MB RAM), and a local, file-based hierarchy engineered from the ground up for seamless Git collaboration and zero-leakage secret isolation.

### 🌟 Key Features
- **Ultra-Lightweight Architecture:** Powered by **Tauri v2** + **Rust Core Engine** (`reqwest`, `tokio`) + **React 19** with Tailwind CSS v4 and CodeMirror 6.
- **Git-Native File-per-Request Storage:** Requests are saved as individual JSON files in project folders. Never experience monolithic collection merge conflicts again.
- **Dual-Tier Secret Isolation:** Variables marked `is_secret: true` (e.g. API tokens, personal staging passwords) automatically route to `*.local.json` files and are excluded from Git via auto-generated `.gitignore` rules.
- **Granular Sharing & Postman Interoperability:**
  - Share an entire workspace or a single project folder independently.
  - 1-click **Export to Postman Collection v2.1** with toggleable secret masking (prevents accidental credential disclosure).
- **Auto Token / Variable Extractors:** Point-and-click declarative extractors to automatically capture JWT access tokens from JSON response bodies (`data.token`) or response headers (`Authorization`) into Project/Environment variables.
- **Instant cURL Generation:** 1-click "Copy as cURL" with automatic variable interpolation.
- **Developer Ergonomics:** Persistent last-workspace restoration, CodeMirror 6 JSON viewer with search & syntax highlighting, and keyboard shortcuts (`Cmd+Enter` to send, `Cmd+S` to save).

---

## ⌨️ Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd + Enter` / `Ctrl + Enter` | Execute active HTTP request |
| `Cmd + S` / `Ctrl + S` | Save active request file |

---

## 📦 Directory Structure

```
my-api-workspace/
├── .beamrest/
│   ├── workspace.json            # Workspace meta, project list
│   └── state.local.json          # UI state, active tabs (in .gitignore)
├── environments/
│   ├── dev.env.json              # Public environment variables (committed)
│   └── dev.env.local.json        # Secret variables (in .gitignore)
├── Auth-Service/                 # Standalone Project 1
│   ├── project.json              # Project variables, default Auth
│   ├── project.local.json        # Secret project variables (in .gitignore)
│   ├── 01-login.request.json     # Individual request
│   └── 02-refresh.request.json
└── .gitignore                    # Auto-generated rules for *.local.json
```

---

## 🛠️ Development & Building

```bash
# Install dependencies
pnpm install

# Run Frontend + Tauri in Dev Mode
pnpm tauri dev

# Run Tests
pnpm test          # Frontend Vitest
cargo test --manifest-path src-tauri/Cargo.toml  # Rust core engine

# Build Production Release
pnpm tauri build
```

---

## 📄 License
MIT © AM Software
