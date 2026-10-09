---
version: 1.0.0
name: BeamREST Design Specification
description: Precision-engineered, ultra-lightweight dark aesthetic for BeamREST API testing suite.
colors:
  bg-app: "#0b0f19"
  bg-sidebar: "#080c14"
  bg-pane: "#0e1322"
  bg-card: "#131b2e"
  bg-active: "#1b253e"
  border: "#1e293b"
  border-subtle: "#162033"
  text-primary: "#f8fafc"
  text-secondary: "#94a3b8"
  text-muted: "#64748b"
  beam-cyan: "#06b6d4"
  beam-glow: "#22d3ee"
  accent: "#0ea5e9"
  accent-hover: "#38bdf8"
  method-get: "#10b981"
  method-post: "#f59e0b"
  method-put: "#3b82f6"
  method-delete: "#ef4444"
  method-patch: "#8b5cf6"
  status-success: "#10b981"
  status-error: "#ef4444"
  status-warning: "#f59e0b"
typography:
  ui:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: "400"
    lineHeight: "1.4"
  mono:
    fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, Monaco, Consolas, monospace"
    fontSize: "12px"
    fontWeight: "400"
    lineHeight: "1.5"
rounded:
  xs: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  header:
    height: "44px"
    background: "{colors.bg-sidebar}"
    borderBottom: "1px solid {colors.border}"
  sidebar:
    width: "260px"
    background: "{colors.bg-sidebar}"
    borderRight: "1px solid {colors.border}"
  url-bar:
    height: "40px"
    background: "{colors.bg-card}"
    borderRadius: "{rounded.md}"
    border: "1px solid {colors.border}"
  tabs:
    height: "36px"
    borderBottom: "1px solid {colors.border}"
---

# BeamREST Design Principles

1. **Information Density & Developer Focus:** Every pixel serves API inspection. No decorative fluff, no animated marketing banners.
2. **Instant Status Feedback:** Method pills (GET in emerald, POST in amber, DELETE in rose) and HTTP status codes (2xx, 4xx, 5xx) must be instantly recognizable.
3. **Variable Highlighting:** Dynamic template variables like `{{baseUrl}}` and `{{jwt_token}}` stand out with subtle cyan badge pills within URL and Header inputs.
4. **Secret Obfuscation:** Variables marked `is_secret: true` show masked asterisks (`••••••••`) with one-click momentary peek toggles.
