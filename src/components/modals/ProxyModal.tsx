import React, { useState, useEffect } from 'react'
import { X, Globe, Check } from 'lucide-react'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'

export const ProxyModal: React.FC = () => {
  const { isProxyModalOpen, setProxyModalOpen, proxy, setProxy } =
    useWorkspaceStore()

  const [enabled, setEnabled] = useState(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isProxyModalOpen) {
      setEnabled(proxy.enabled)
      setUrl(proxy.url)
      setError(null)
    }
  }, [isProxyModalOpen, proxy])

  if (!isProxyModalOpen) return null

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (enabled) {
      if (!trimmed) {
        setError('Please enter a proxy URL.')
        return
      }
      if (
        !trimmed.startsWith('http://') &&
        !trimmed.startsWith('https://') &&
        !trimmed.startsWith('socks5://') &&
        !trimmed.startsWith('socks5h://')
      ) {
        setError('Proxy URL must start with http://, https://, socks5://, or socks5h://')
        return
      }
    }

    setProxy({
      enabled,
      url: trimmed,
    })
    setProxyModalOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-xs select-none">
      <div className="w-[460px] rounded-lg border border-[#1e293b] bg-[#0b0f19] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1e293b] bg-[#0e1322] px-4 py-3">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Globe className="h-4 w-4 text-[#38bdf8]" />
            <span>Proxy Configuration</span>
          </div>
          <button
            data-testid="proxy-modal-close-btn"
            onClick={() => setProxyModalOpen(false)}
            className="rounded p-1 text-[#64748b] hover:bg-[#1e293b] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-4 space-y-4">
          {error && (
            <div className="rounded border border-[#ef4444]/30 bg-[#ef4444]/10 p-2.5 text-[#f87171]">
              {error}
            </div>
          )}

          {/* Toggle Enable */}
          <div className="flex items-center justify-between rounded border border-[#1e293b] bg-[#0e1322] p-3">
            <div>
              <div className="font-semibold text-white">Enable Proxy</div>
              <div className="text-[11px] text-[#64748b]">
                Route API requests through an HTTP or SOCKS5 proxy
              </div>
            </div>
            <label
              data-testid="proxy-enable-toggle"
              className="relative inline-flex items-center cursor-pointer"
            >
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#1e293b] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#334155] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0284c7]" />
            </label>
          </div>

          {/* Proxy URL Input */}
          <div>
            <label className="block mb-1.5 text-[#94a3b8] font-medium">
              Proxy URL
            </label>
            <input
              data-testid="proxy-url-input"
              type="text"
              placeholder="e.g. http://127.0.0.1:8080 or socks5://127.0.0.1:1080"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={!enabled}
              className="w-full rounded border border-[#1e293b] bg-[#131b2e] px-3 py-2 font-mono text-xs text-white placeholder-[#64748b] focus:border-[#38bdf8] focus:outline-none disabled:opacity-40"
            />
            <p className="mt-1.5 text-[11px] text-[#64748b]">
              Supported protocols: <span className="font-mono text-[#38bdf8]">http://</span>, <span className="font-mono text-[#38bdf8]">https://</span>, <span className="font-mono text-[#38bdf8]">socks5://</span>, <span className="font-mono text-[#38bdf8]">socks5h://</span>
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!enabled}
              onClick={() => setUrl('http://127.0.0.1:8080')}
              className="rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 text-[11px] text-[#94a3b8] hover:border-[#38bdf8]/40 hover:text-[#38bdf8] disabled:opacity-40 transition-colors"
            >
              HTTP: 8080
            </button>
            <button
              type="button"
              disabled={!enabled}
              onClick={() => setUrl('socks5://127.0.0.1:1080')}
              className="rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 text-[11px] text-[#94a3b8] hover:border-[#38bdf8]/40 hover:text-[#38bdf8] disabled:opacity-40 transition-colors"
            >
              SOCKS5: 1080
            </button>
            <button
              type="button"
              disabled={!enabled}
              onClick={() => setUrl('socks5://127.0.0.1:9050')}
              className="rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 text-[11px] text-[#94a3b8] hover:border-[#38bdf8]/40 hover:text-[#38bdf8] disabled:opacity-40 transition-colors"
            >
              Tor: 9050
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-[#1e293b] pt-3">
            <button
              type="button"
              onClick={() => setProxyModalOpen(false)}
              className="rounded border border-[#1e293b] bg-[#131b2e] px-3 py-1.5 text-[#cbd5e1] hover:bg-[#1e293b] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              data-testid="proxy-save-btn"
              type="submit"
              className="flex items-center gap-1.5 rounded bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] px-4 py-1.5 font-semibold text-white shadow-sm hover:from-[#0369a1] hover:to-[#0284c7] transition-all"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Apply Proxy</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
