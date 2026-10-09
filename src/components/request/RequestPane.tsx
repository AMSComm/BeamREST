import React from 'react'
import {
  Send,
  Save,
  Terminal,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'
import { CodeEditor } from '../common/CodeEditor'
import { ExtractorRule, KeyValuePair } from '../../types'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

export const RequestPane: React.FC = () => {
  const {
    activeRequest,
    isSending,
    activeTab,
    updateActiveRequest,
    sendRequest,
    saveActiveRequest,
    copyCurl,
    setActiveTab,
  } = useWorkspaceStore()

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

  return (
    <div className="flex flex-1 flex-col h-full bg-[#0b0f19] text-xs">
      {/* Top URL and Action Bar */}
      <div className="flex items-center gap-2 border-b border-[#1e293b] p-3 bg-[#0e1322]">
        {/* Method Picker */}
        <select
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
          <input
            type="text"
            value={activeRequest.url}
            onChange={(e) => updateActiveRequest({ url: e.target.value })}
            placeholder="Enter URL or use {{variables}} (e.g. {{baseUrl}}/api/v1/users)"
            className="w-full rounded border border-[#1e293b] bg-[#131b2e] px-3 py-1.5 font-mono text-xs text-[#f8fafc] placeholder-[#64748b] focus:border-[#38bdf8] focus:outline-none"
          />
        </div>

        {/* Send Button */}
        <button
          onClick={sendRequest}
          disabled={isSending}
          className="flex items-center gap-1.5 rounded bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] px-4 py-1.5 font-semibold text-white shadow-sm hover:from-[#0369a1] hover:to-[#0284c7] disabled:opacity-50 transition-all cursor-pointer"
        >
          {isSending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          <span>Send</span>
        </button>

        {/* Save Button */}
        <button
          onClick={saveActiveRequest}
          className="flex items-center gap-1 rounded border border-[#1e293b] bg-[#131b2e] px-2.5 py-1.5 text-[#cbd5e1] hover:border-[#334155] hover:text-white transition-colors"
          title="Save Request File"
        >
          <Save className="h-3.5 w-3.5" />
          <span>Save</span>
        </button>

        {/* Copy cURL Button */}
        <button
          onClick={copyCurl}
          className="flex items-center gap-1 rounded border border-[#1e293b] bg-[#131b2e] px-2.5 py-1.5 text-[#cbd5e1] hover:border-[#38bdf8]/40 hover:text-[#38bdf8] transition-colors"
          title="Copy Request as cURL command"
        >
          <Terminal className="h-3.5 w-3.5" />
          <span>cURL</span>
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
                    <input
                      type="text"
                      placeholder="Key"
                      value={param.key}
                      onChange={(e) => handleUpdateParam(idx, { key: e.target.value })}
                      className="w-1/3 rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 text-xs text-white focus:border-[#38bdf8] focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Value (supports {{variables}})"
                      value={param.value}
                      onChange={(e) => handleUpdateParam(idx, { value: e.target.value })}
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
                    <input
                      type="text"
                      placeholder="Header Name"
                      value={header.key}
                      onChange={(e) => handleUpdateHeader(idx, { key: e.target.value })}
                      className="w-1/3 rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 text-xs text-white focus:border-[#38bdf8] focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Header Value"
                      value={header.value}
                      onChange={(e) => handleUpdateHeader(idx, { value: e.target.value })}
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
                    auth: { type: e.target.value as any, token: activeRequest.auth?.token || '' },
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

            {activeRequest.auth?.type === 'bearer' && (
              <div className="space-y-1">
                <label className="text-[11px] text-[#94a3b8]">Token (supports variables)</label>
                <input
                  type="text"
                  placeholder="e.g. {{jwt_token}}"
                  value={activeRequest.auth?.token || ''}
                  onChange={(e) =>
                    updateActiveRequest({
                      auth: { type: 'bearer', token: e.target.value },
                    })
                  }
                  className="w-full rounded border border-[#1e293b] bg-[#131b2e] px-2.5 py-1.5 font-mono text-xs text-white focus:border-[#38bdf8] focus:outline-none"
                />
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
