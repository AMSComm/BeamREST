import React, { useState } from 'react'
import {
  Clock,
  HardDrive,
  Copy,
  Check,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'
import { CodeEditor } from '../common/CodeEditor'

export const ResponsePane: React.FC = () => {
  const { response, responseTab, curlText, error, setResponseTab } = useWorkspaceStore()
  const [copied, setCopied] = useState(false)

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  // Format response body if valid JSON
  const getFormattedBody = (): string => {
    if (!response || !response.body) return ''
    try {
      const parsed = JSON.parse(response.body)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return response.body
    }
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col h-full border-l border-[#1e293b] bg-[#090d16] p-4 text-xs">
        <div className="flex items-center gap-2 rounded border border-[#ef4444]/30 bg-[#ef4444]/10 p-3 text-[#f87171]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Request Execution Error</div>
            <div className="mt-1 font-mono text-[11px]">{error}</div>
          </div>
        </div>
      </div>
    )
  }

  if (!response && !curlText) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center h-full border-l border-[#1e293b] bg-[#090d16] text-xs text-[#64748b]">
        <span>Send a request to inspect response details.</span>
      </div>
    )
  }

  const isSuccess = response && response.status >= 200 && response.status < 300
  const isError = response && response.status >= 400

  const statusColor = isSuccess
    ? 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30'
    : isError
    ? 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30'
    : 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30'

  return (
    <div className="flex flex-1 flex-col h-full border-l border-[#1e293b] bg-[#0b0f19] text-xs">
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between border-b border-[#1e293b] bg-[#0e1322] px-3 py-2">
        <div className="flex items-center gap-3">
          {response && (
            <>
              {/* Status Pill */}
              <div
                className={`flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono font-bold text-xs ${statusColor}`}
              >
                <span>{response.status}</span>
                <span>{response.status_text}</span>
              </div>

              {/* Latency Pill */}
              <div className="flex items-center gap-1 font-mono text-[#94a3b8]">
                <Clock className="h-3.5 w-3.5 text-[#38bdf8]" />
                <span>{response.latency_ms} ms</span>
              </div>

              {/* Size Pill */}
              <div className="flex items-center gap-1 font-mono text-[#94a3b8]">
                <HardDrive className="h-3.5 w-3.5 text-[#38bdf8]" />
                <span>{(response.size_bytes / 1024).toFixed(2)} KB</span>
              </div>
            </>
          )}

          {!response && curlText && (
            <span className="font-semibold text-[#38bdf8]">cURL Command Preview</span>
          )}
        </div>

        {/* Copy Button */}
        <button
          onClick={() => handleCopy(responseTab === 'curl' ? curlText || '' : response?.body || '')}
          className="flex items-center gap-1 rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 text-[#cbd5e1] hover:border-[#38bdf8]/40 hover:text-white transition-colors"
          title="Copy content to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-[#10b981]" />
              <span className="text-[#10b981]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 text-[#94a3b8]" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Response Tabs */}
      <div className="flex border-b border-[#1e293b] bg-[#080c14] px-3">
        {(['body', 'headers', 'curl', 'extracted'] as const).map((tab) => {
          const isActive = responseTab === tab
          let badge: number | null = null

          if (tab === 'headers' && response) badge = response.headers.length || null
          if (tab === 'extracted' && response) badge = response.extracted_variables.length || null

          return (
            <button
              key={tab}
              onClick={() => setResponseTab(tab)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium capitalize transition-colors ${
                isActive
                  ? 'border-[#38bdf8] text-[#38bdf8]'
                  : 'border-transparent text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              <span>{tab === 'curl' ? 'cURL' : tab === 'extracted' ? 'Variables' : tab}</span>
              {badge !== null && (
                <span className="rounded-full bg-[#1e293b] px-1.5 py-0.2 text-[10px] text-[#94a3b8]">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Response Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* BODY TAB */}
        {responseTab === 'body' && (
          <div className="h-full min-h-[300px]">
            {response ? (
              <CodeEditor value={getFormattedBody()} readOnly height="100%" />
            ) : (
              <div className="text-[#64748b]">No response body yet.</div>
            )}
          </div>
        )}

        {/* HEADERS TAB */}
        {responseTab === 'headers' && (
          <div className="space-y-1">
            {response?.headers.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded border border-[#1e293b] bg-[#0e1322] px-2.5 py-1 font-mono"
              >
                <span className="font-semibold text-[#38bdf8]">{h.key}</span>
                <span className="text-[#cbd5e1] truncate max-w-md">{h.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* CURL TAB */}
        {responseTab === 'curl' && (
          <div className="rounded border border-[#1e293b] bg-[#090d16] p-3 font-mono text-xs text-[#38bdf8] whitespace-pre-wrap break-all">
            {curlText || 'Click "cURL" button above to generate.'}
          </div>
        )}

        {/* EXTRACTED VARIABLES TAB */}
        {responseTab === 'extracted' && (
          <div className="space-y-2">
            {!response || response.extracted_variables.length === 0 ? (
              <div className="p-4 text-center text-[#64748b]">
                No variables were extracted from this response.
              </div>
            ) : (
              response.extracted_variables.map((ev, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded border border-[#10b981]/30 bg-[#10b981]/5 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#10b981]" />
                    <span className="font-mono font-semibold text-white">
                      {`{{${ev.key}}}`}
                    </span>
                    <span className="rounded bg-[#1e293b] px-1.5 py-0.5 text-[10px] text-[#94a3b8] uppercase">
                      {ev.scope}
                    </span>
                    {ev.is_secret && (
                      <span className="rounded bg-[#f59e0b]/20 px-1.5 py-0.5 text-[10px] text-[#f59e0b]">
                        Secret
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-[#38bdf8] truncate max-w-xs">
                    {ev.value}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
