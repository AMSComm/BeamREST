import React from 'react'
import {
  Send,
  Save,
  Plus,
  Trash2,
  Loader2,
  Edit2,
  Check,
  Copy,
} from 'lucide-react'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'
import { CodeEditor } from '../common/CodeEditor'
import { VariableInput } from '../common/VariableInput'
import { ExtractorRule, KeyValuePair } from '../../types'
import { parseCurlCommand } from '../../utils/curlParser'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

export const RequestPane: React.FC = () => {
  const {
    activeRequest,
    activeProjectId,
    workspace,
    isSending,
    activeTab,
    updateActiveRequest,
    renameRequest,
    cloneRequest,
    sendRequest,
    saveActiveRequest,
    isRequestDirty,
    setActiveTab,
  } = useWorkspaceStore()

  const [isEditingName, setIsEditingName] = React.useState(false)
  const [editedName, setEditedName] = React.useState('')

  const currentProject = workspace?.projects.find((p) => p.id === activeProjectId)

  const handleSaveRename = async () => {
    if (!activeRequest || !activeProjectId) return
    const trimmed = editedName.trim()
    if (trimmed && trimmed !== activeRequest.name) {
      await renameRequest(activeProjectId, activeRequest.id, trimmed)
    }
    setIsEditingName(false)
  }

  if (!activeRequest) {
    return (
      <div className="flex flex-1 items-center justify-center text-xs text-[#64748b]">
        Select or create a request from the sidebar.
      </div>
    )
  }

  // Params Handlers
  const handleAddParam = () => {
    const updated = [
      ...activeRequest.params,
      { key: '', value: '', enabled: true },
    ]
    updateActiveRequest({ params: updated })
  }

  const handleUpdateParam = (index: number, patch: Partial<KeyValuePair>) => {
    const updated = activeRequest.params.map((p, i) =>
      i === index ? { ...p, ...patch } : p
    )
    updateActiveRequest({ params: updated })
  }

  const handleDeleteParam = (index: number) => {
    const updated = activeRequest.params.filter((_, i) => i !== index)
    updateActiveRequest({ params: updated })
  }

  // Headers Handlers
  const handleAddHeader = () => {
    const updated = [
      ...activeRequest.headers,
      { key: '', value: '', enabled: true },
    ]
    updateActiveRequest({ headers: updated })
  }

  const handleUpdateHeader = (index: number, patch: Partial<KeyValuePair>) => {
    const updated = activeRequest.headers.map((h, i) =>
      i === index ? { ...h, ...patch } : h
    )
    updateActiveRequest({ headers: updated })
  }

  const handleDeleteHeader = (index: number) => {
    const updated = activeRequest.headers.filter((_, i) => i !== index)
    updateActiveRequest({ headers: updated })
  }

  // Extractor Handlers
  const handleAddExtractor = () => {
    const newRule: ExtractorRule = {
      id: 'ext-' + Date.now(),
      name: 'Extract Token',
      source: 'bodyjson',
      expression: 'data.token',
      target_variable: 'jwt_token',
      target_scope: 'project',
      is_secret: true,
      enabled: true,
    }
    updateActiveRequest({ extractors: [...activeRequest.extractors, newRule] })
  }

  const handleUpdateExtractor = (index: number, patch: Partial<ExtractorRule>) => {
    const updated = activeRequest.extractors.map((r, i) =>
      i === index ? { ...r, ...patch } : r
    )
    updateActiveRequest({ extractors: updated })
  }

  const handleDeleteExtractor = (index: number) => {
    const updated = activeRequest.extractors.filter((_, i) => i !== index)
    updateActiveRequest({ extractors: updated })
  }

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (text && text.trim().toLowerCase().startsWith('curl')) {
      const parsed = parseCurlCommand(text)
      if (parsed) {
        e.preventDefault()
        updateActiveRequest(parsed)
      }
    }
  }

  const handleUrlChange = (val: string) => {
    if (val.trim().toLowerCase().startsWith('curl ')) {
      const parsed = parseCurlCommand(val)
      if (parsed) {
        updateActiveRequest(parsed)
        return
      }
    }
    updateActiveRequest({ url: val })
  }

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      sendRequest()
    }
  }

  return (
    <div className="flex flex-1 flex-col h-full bg-[#0b0f19] text-xs">
      {/* Request Header Bar with Breadcrumb & Editable Title */}
      <div className="flex items-center justify-between border-b border-[#1e293b] px-3 py-1.5 bg-[#080c14]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {currentProject && (
            <span className="text-[11px] font-medium text-[#64748b] shrink-0 truncate max-w-[160px]">
              {currentProject.name} <span className="text-[#334155]">/</span>
            </span>
          )}

          {isEditingName ? (
            <div className="flex items-center gap-1.5 flex-1 max-w-sm">
              <input
                data-testid="request-pane-name-input"
                type="text"
                autoFocus
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    await handleSaveRename()
                  } else if (e.key === 'Escape') {
                    setIsEditingName(false)
                  }
                }}
                onBlur={handleSaveRename}
                className="w-full rounded border border-[#38bdf8] bg-[#131b2e] px-2 py-0.5 text-xs text-[#f8fafc] focus:outline-none"
              />
              <button
                data-testid="request-pane-save-name-btn"
                onMouseDown={async (e) => {
                  e.preventDefault()
                  await handleSaveRename()
                }}
                className="rounded p-1 text-[#10b981] hover:bg-[#1e293b] cursor-pointer"
                title="Save Name"
              >
                <Check className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 group cursor-pointer truncate"
              onClick={() => {
                setEditedName(activeRequest.name)
                setIsEditingName(true)
              }}
              title="Click to rename request"
            >
              <h2
                data-testid="request-pane-name"
                className="font-semibold text-xs text-[#f8fafc] group-hover:text-[#38bdf8] transition-colors truncate"
              >
                {activeRequest.name}
              </h2>
              <button
                data-testid="request-pane-edit-name-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  setEditedName(activeRequest.name)
                  setIsEditingName(true)
                }}
                className="rounded p-0.5 text-[#64748b] hover:text-[#38bdf8] opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                title="Rename Request"
              >
                <Edit2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Header Actions */}
        {currentProject && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              data-testid="request-pane-clone-btn"
              onClick={() => cloneRequest(currentProject.id, activeRequest.id)}
              className="flex items-center gap-1 rounded bg-[#131b2e] px-2 py-0.5 text-[11px] text-[#94a3b8] hover:text-[#38bdf8] hover:bg-[#1e293b] transition-colors cursor-pointer"
              title="Clone / Duplicate Request (Cmd+D)"
            >
              <Copy className="h-3 w-3" />
              <span>Clone</span>
            </button>
          </div>
        )}
      </div>

      {/* Top URL and Action Bar */}
      <div className="flex items-center gap-2 border-b border-[#1e293b] p-3 bg-[#0e1322]">
        {/* Method Picker */}
        <select
          data-testid="request-method-select"
          value={activeRequest.method}
          onChange={(e) => updateActiveRequest({ method: e.target.value })}
          className="rounded border border-[#1e293b] bg-[#131b2e] px-2.5 py-1.5 font-mono font-bold text-xs text-[#38bdf8] outline-none cursor-pointer"
        >
          {HTTP_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {/* URL Input */}
        <div className="relative flex-1">
          <VariableInput
            data-testid="request-url-input"
            value={activeRequest.url}
            onChange={handleUrlChange}
            onPaste={handleUrlPaste}
            onKeyDown={handleUrlKeyDown}
            placeholder="Enter URL, paste cURL command, or use {{variables}}"
            className="w-full rounded border border-[#1e293b] bg-[#131b2e] px-3 py-1.5 font-mono text-xs text-[#f8fafc] placeholder-[#64748b] focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        {/* Send Button (Icon Only) */}
        <button
          data-testid="request-send-btn"
          onClick={sendRequest}
          disabled={isSending}
          className="flex items-center justify-center rounded bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] p-2 font-semibold text-white shadow-sm hover:from-[#0369a1] hover:to-[#0284c7] disabled:opacity-50 transition-all cursor-pointer"
          title="Send Request (Enter / Cmd+Enter)"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>

        {/* Save Button (Icon Only with Unsaved Dot) */}
        <button
          data-testid="request-save-btn"
          onClick={saveActiveRequest}
          className="relative flex items-center justify-center rounded border border-[#1e293b] bg-[#131b2e] p-2 text-[#cbd5e1] hover:border-[#334155] hover:text-white transition-colors cursor-pointer"
          title={isRequestDirty() ? 'Save Request (Cmd+S) - Unsaved changes' : 'Save Request (Cmd+S)'}
        >
          <Save className="h-4 w-4" />
          {isRequestDirty() && (
            <span
              data-testid="request-unsaved-dot"
              className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[#38bdf8]"
            />
          )}
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-[#1e293b] bg-[#080c14] px-3">
        {(['params', 'headers', 'body', 'auth', 'extractors'] as const).map((tab) => {
          const isActive = activeTab === tab
          let badge: number | string | null = null

          if (tab === 'params') badge = activeRequest.params.length || null
          if (tab === 'headers') badge = activeRequest.headers.length || null
          if (tab === 'body' && activeRequest.body_type !== 'none') badge = activeRequest.body_type
          if (tab === 'extractors') badge = activeRequest.extractors.length || null

          return (
            <button
              key={tab}
              data-testid={`request-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium capitalize transition-colors ${
                isActive
                  ? 'border-[#38bdf8] text-[#38bdf8]'
                  : 'border-transparent text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              <span>{tab === 'extractors' ? 'Auto Extractors' : tab}</span>
              {badge !== null && (
                <span className="rounded-full bg-[#1e293b] px-1.5 py-0.2 text-[10px] text-[#94a3b8]">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* PARAMS TAB */}
        {activeTab === 'params' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
                Query Parameters
              </span>
              <button
                data-testid="add-param-btn"
                onClick={handleAddParam}
                className="flex items-center gap-1 text-[11px] text-[#38bdf8] hover:underline"
              >
                <Plus className="h-3 w-3" /> Add Parameter
              </button>
            </div>

            <div className="rounded border border-[#1e293b] bg-[#0e1322] divide-y divide-[#1e293b]">
              {activeRequest.params.length === 0 ? (
                <div className="p-3 text-center text-[#64748b]">No query parameters.</div>
              ) : (
                activeRequest.params.map((param, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-1.5">
                    <input
                      type="checkbox"
                      checked={param.enabled}
                      onChange={(e) =>
                        handleUpdateParam(idx, { enabled: e.target.checked })
                      }
                      className="accent-[#0ea5e9]"
                    />
                    <VariableInput
                      placeholder="Key"
                      value={param.key}
                      onChange={(val) => handleUpdateParam(idx, { key: val })}
                      className="w-1/3 rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 text-xs text-white focus:border-[#38bdf8] focus:outline-none"
                    />
                    <VariableInput
                      placeholder="Value (supports {{variables}})"
                      value={param.value}
                      onChange={(val) => handleUpdateParam(idx, { value: val })}
                      className="flex-1 rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 text-xs text-white focus:border-[#38bdf8] focus:outline-none"
                    />
                    <button
                      onClick={() => handleDeleteParam(idx)}
                      className="p-1 text-[#64748b] hover:text-[#ef4444]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* HEADERS TAB */}
        {activeTab === 'headers' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
                Request Headers
              </span>
              <button
                data-testid="add-header-btn"
                onClick={handleAddHeader}
                className="flex items-center gap-1 text-[11px] text-[#38bdf8] hover:underline"
              >
                <Plus className="h-3 w-3" /> Add Header
              </button>
            </div>

            <div className="rounded border border-[#1e293b] bg-[#0e1322] divide-y divide-[#1e293b]">
              {activeRequest.headers.length === 0 ? (
                <div className="p-3 text-center text-[#64748b]">No custom headers.</div>
              ) : (
                activeRequest.headers.map((header, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-1.5">
                    <input
                      type="checkbox"
                      checked={header.enabled}
                      onChange={(e) =>
                        handleUpdateHeader(idx, { enabled: e.target.checked })
                      }
                      className="accent-[#0ea5e9]"
                    />
                    <VariableInput
                      placeholder="Header Name"
                      value={header.key}
                      onChange={(val) => handleUpdateHeader(idx, { key: val })}
                      className="w-1/3 rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 text-xs text-white focus:border-[#38bdf8] focus:outline-none"
                    />
                    <VariableInput
                      placeholder="Header Value"
                      value={header.value}
                      onChange={(val) => handleUpdateHeader(idx, { value: val })}
                      className="flex-1 rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 text-xs text-white focus:border-[#38bdf8] focus:outline-none"
                    />
                    <button
                      onClick={() => handleDeleteHeader(idx)}
                      className="p-1 text-[#64748b] hover:text-[#ef4444]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* BODY TAB */}
        {activeTab === 'body' && (
          <div className="flex flex-col h-full space-y-2">
            <div className="flex items-center gap-4 py-1 text-xs text-[#cbd5e1]">
              {(['none', 'json', 'urlencoded', 'raw'] as const).map((type) => (
                <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="body_type"
                    checked={activeRequest.body_type === type}
                    onChange={() => updateActiveRequest({ body_type: type })}
                    className="accent-[#0ea5e9]"
                  />
                  <span className="capitalize">{type}</span>
                </label>
              ))}
            </div>

            {activeRequest.body_type !== 'none' ? (
              <div className="flex-1 min-h-[220px]">
                <CodeEditor
                  value={activeRequest.body_content}
                  onChange={(val) => updateActiveRequest({ body_content: val })}
                  height="260px"
                />
              </div>
            ) : (
              <div className="p-6 text-center text-[#64748b]">This request does not have a body.</div>
            )}
          </div>
        )}

        {/* AUTH TAB */}
        {activeTab === 'auth' && (
          <div className="space-y-4 max-w-lg">
            <div className="flex items-center gap-2">
              <span className="text-[#64748b]">Type:</span>
              <select
                value={activeRequest.auth?.type || 'none'}
                onChange={(e) =>
                  updateActiveRequest({
                    auth: {
                      type: e.target.value as any,
                      token: activeRequest.auth?.token || '',
                      username: activeRequest.auth?.username || '',
                      password: activeRequest.auth?.password || '',
                      key: activeRequest.auth?.key || '',
                      value: activeRequest.auth?.value || '',
                      addTo: activeRequest.auth?.addTo || 'header',
                    },
                  })
                }
                className="rounded border border-[#1e293b] bg-[#131b2e] px-2.5 py-1 text-xs text-[#38bdf8] outline-none"
              >
                <option value="none">No Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="apikey">API Key</option>
                <option value="inherit">Inherit from Project</option>
              </select>
            </div>

            {/* Bearer Auth */}
            {activeRequest.auth?.type === 'bearer' && (
              <div className="space-y-1">
                <label className="text-[11px] text-[#94a3b8]">Bearer Token (supports variables)</label>
                <VariableInput
                  placeholder="e.g. {{jwt_token}}"
                  value={activeRequest.auth?.token || ''}
                  onChange={(val) =>
                    updateActiveRequest({
                      auth: { ...activeRequest.auth, type: 'bearer', token: val },
                    })
                  }
                  className="w-full rounded border border-[#1e293b] bg-[#131b2e] px-2.5 py-1.5 font-mono text-xs text-white focus:border-[#38bdf8] focus:outline-none"
                />
              </div>
            )}

            {/* Basic Auth */}
            {activeRequest.auth?.type === 'basic' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#94a3b8]">Username</label>
                  <VariableInput
                    placeholder="Username"
                    value={activeRequest.auth?.username || ''}
                    onChange={(val) =>
                      updateActiveRequest({
                        auth: { ...activeRequest.auth, type: 'basic', username: val },
                      })
                    }
                    className="w-full rounded border border-[#1e293b] bg-[#131b2e] px-2.5 py-1.5 font-mono text-xs text-white focus:border-[#38bdf8] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#94a3b8]">Password</label>
                  <input
                    type="password"
                    placeholder="Password"
                    value={activeRequest.auth?.password || ''}
                    onChange={(e) =>
                      updateActiveRequest({
                        auth: { ...activeRequest.auth, type: 'basic', password: e.target.value },
                      })
                    }
                    className="w-full rounded border border-[#1e293b] bg-[#131b2e] px-2.5 py-1.5 font-mono text-xs text-white focus:border-[#38bdf8] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* API Key Auth */}
            {activeRequest.auth?.type === 'apikey' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#94a3b8]">Key</label>
                  <VariableInput
                    placeholder="e.g. X-API-Key"
                    value={activeRequest.auth?.key || ''}
                    onChange={(val) =>
                      updateActiveRequest({
                        auth: { ...activeRequest.auth, type: 'apikey', key: val },
                      })
                    }
                    className="w-full rounded border border-[#1e293b] bg-[#131b2e] px-2.5 py-1.5 font-mono text-xs text-white focus:border-[#38bdf8] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#94a3b8]">Value</label>
                  <VariableInput
                    placeholder="e.g. {{apiKey}}"
                    value={activeRequest.auth?.value || ''}
                    onChange={(val) =>
                      updateActiveRequest({
                        auth: { ...activeRequest.auth, type: 'apikey', value: val },
                      })
                    }
                    className="w-full rounded border border-[#1e293b] bg-[#131b2e] px-2.5 py-1.5 font-mono text-xs text-white focus:border-[#38bdf8] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#94a3b8]">Add To</label>
                  <select
                    value={activeRequest.auth?.addTo || 'header'}
                    onChange={(e) =>
                      updateActiveRequest({
                        auth: { ...activeRequest.auth, type: 'apikey', addTo: e.target.value as any },
                      })
                    }
                    className="w-full rounded border border-[#1e293b] bg-[#131b2e] px-2.5 py-1.5 font-mono text-xs text-white focus:border-[#38bdf8] focus:outline-none"
                  >
                    <option value="header">Header</option>
                    <option value="query">Query Params</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* EXTRACTORS TAB */}
        {activeTab === 'extractors' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-semibold text-[#f8fafc]">Response Token & Variable Extractors</h4>
                <p className="text-[11px] text-[#64748b]">
                  Auto-capture JWT or response fields upon HTTP response and save to Project/Environment variables.
                </p>
              </div>
              <button
                data-testid="add-extractor-btn"
                onClick={handleAddExtractor}
                className="flex items-center gap-1 rounded bg-[#0284c7]/20 border border-[#0284c7]/40 px-2 py-1 text-[#38bdf8] hover:bg-[#0284c7]/30 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add Extractor Rule
              </button>
            </div>

            <div className="space-y-2">
              {activeRequest.extractors.length === 0 ? (
                <div className="rounded border border-[#1e293b] bg-[#0e1322] p-4 text-center text-[#64748b]">
                  No extractors configured. Click "Add Extractor Rule" to automatically capture JWT tokens from response JSON!
                </div>
              ) : (
                activeRequest.extractors.map((rule, idx) => (
                  <div
                    key={rule.id}
                    className="flex flex-wrap items-center gap-2 rounded border border-[#1e293b] bg-[#0e1322] p-2"
                  >
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(e) =>
                        handleUpdateExtractor(idx, { enabled: e.target.checked })
                      }
                      className="accent-[#0ea5e9]"
                      title="Enable/Disable rule"
                    />

                    {/* Source */}
                    <select
                      value={rule.source}
                      onChange={(e) =>
                        handleUpdateExtractor(idx, { source: e.target.value as any })
                      }
                      className="rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 text-xs text-[#38bdf8] outline-none"
                    >
                      <option value="bodyjson">Body (JSON)</option>
                      <option value="header">Header</option>
                      <option value="regex">Regex</option>
                    </select>

                    {/* Path / Expression */}
                    <input
                      type="text"
                      placeholder="Field (e.g. data.token)"
                      value={rule.expression}
                      onChange={(e) =>
                        handleUpdateExtractor(idx, { expression: e.target.value })
                      }
                      className="flex-1 min-w-[130px] rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 text-xs text-white focus:border-[#38bdf8] focus:outline-none"
                    />

                    <span className="text-[#64748b]">➔ Save to:</span>

                    {/* Target Variable */}
                    <input
                      type="text"
                      placeholder="Variable (e.g. jwt_token)"
                      value={rule.target_variable}
                      onChange={(e) =>
                        handleUpdateExtractor(idx, { target_variable: e.target.value })
                      }
                      className="w-36 rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 font-mono text-xs text-[#38bdf8] focus:border-[#38bdf8] focus:outline-none"
                    />

                    {/* Is Secret Toggle */}
                    <label className="flex items-center gap-1 text-[11px] text-[#cbd5e1] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.is_secret}
                        onChange={(e) =>
                          handleUpdateExtractor(idx, { is_secret: e.target.checked })
                        }
                        className="accent-[#0ea5e9]"
                      />
                      <span>Secret</span>
                    </label>

                    <button
                      onClick={() => handleDeleteExtractor(idx)}
                      className="p-1 text-[#64748b] hover:text-[#ef4444]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
