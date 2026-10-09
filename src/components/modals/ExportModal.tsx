import React, { useState } from 'react'
import {
  X,
  Download,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'
import { tauriApi } from '../../services/tauriApi'

export const ExportModal: React.FC = () => {
  const {
    workspace,
    activeProjectId,
    isExportModalOpen,
    setExportModalOpen,
  } = useWorkspaceStore()

  const [scope, setScope] = useState<'project' | 'workspace'>('project')
  const [includeSecrets, setIncludeSecrets] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exportedJson, setExportedJson] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const activeProject =
    workspace?.projects.find((p) => p.id === activeProjectId) ||
    workspace?.projects[0]

  const handleGenerate = async () => {
    if (!workspace) return
    setIsGenerating(true)
    try {
      const payload = scope === 'project' ? activeProject : workspace
      const jsonStr = await tauriApi.exportPostman(scope, payload, includeSecrets)
      setExportedJson(jsonStr)
    } finally {
      setIsGenerating(false)
    }
  }

  React.useEffect(() => {
    if (isExportModalOpen && workspace) {
      handleGenerate()
    }
  }, [isExportModalOpen, scope, includeSecrets, activeProject])

  if (!isExportModalOpen || !workspace) return null



  const handleCopy = async () => {
    if (!exportedJson) return
    try {
      await navigator.clipboard.writeText(exportedJson)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const handleDownload = () => {
    if (!exportedJson) return
    const blob = new Blob([exportedJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const fileName =
      scope === 'project'
        ? `${activeProject?.name || 'project'}.postman_collection.json`
        : `${workspace.meta.name || 'workspace'}.postman_collection.json`

    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-xs select-none">
      <div className="flex h-[560px] w-[650px] flex-col rounded-lg border border-[#1e293b] bg-[#0b0f19] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1e293b] bg-[#0e1322] px-4 py-3">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-[#10b981]" />
            <span className="font-semibold text-white">Export to Postman Collection (v2.1)</span>
          </div>
          <button
            data-testid="export-close-btn"
            onClick={() => setExportModalOpen(false)}
            className="rounded p-1 text-[#64748b] hover:bg-[#1e293b] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Configuration Controls */}
        <div className="border-b border-[#1e293b] bg-[#080c14] p-4 space-y-3">
          {/* Scope Picker */}
          <div className="flex items-center gap-4">
            <span className="text-[#94a3b8] font-medium">Export Scope:</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-white">
              <input
                data-testid="export-scope-project"
                type="radio"
                name="export_scope"
                checked={scope === 'project'}
                onChange={() => {
                  setScope('project')
                  setExportedJson('')
                }}
                className="accent-[#0ea5e9]"
              />
              <span>Single Project ({activeProject?.name || 'Project'})</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-white">
              <input
                data-testid="export-scope-workspace"
                type="radio"
                name="export_scope"
                checked={scope === 'workspace'}
                onChange={() => {
                  setScope('workspace')
                  setExportedJson('')
                }}
                className="accent-[#0ea5e9]"
              />
              <span>Full Workspace ({workspace.meta.name})</span>
            </label>
          </div>

          {/* Secret Masking Security Notice */}
          <div className="rounded border border-[#38bdf8]/30 bg-[#0284c7]/10 p-2.5">
            <label className="flex items-center gap-2 font-medium text-white cursor-pointer">
              <input
                data-testid="export-include-secrets"
                type="checkbox"
                checked={includeSecrets}
                onChange={(e) => {
                  setIncludeSecrets(e.target.checked)
                  setExportedJson('')
                }}
                className="accent-[#0ea5e9]"
              />
              <span>Include Secret Variable Values</span>
            </label>
            <p className="mt-1 text-[11px] text-[#94a3b8]">
              {includeSecrets ? (
                <span className="flex items-center gap-1 text-[#f59e0b]">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Warning: Secret values (passwords, tokens) will be included in the exported JSON file!
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[#10b981]">
                  <ShieldCheck className="h-3 w-3 shrink-0" />
                  Safe mode: Secret variables will have their values stripped to prevent credentials leakage.
                </span>
              )}
            </p>
          </div>

          <button
            data-testid="export-generate-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full rounded bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] py-1.5 font-semibold text-white hover:from-[#0369a1] hover:to-[#0284c7] transition-all"
          >
            {isGenerating ? 'Generating Postman JSON...' : 'Generate Export JSON'}
          </button>
        </div>

        {/* JSON Preview Area */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col">
          <div className="flex justify-between items-center mb-1 text-[11px] text-[#64748b]">
            <span>JSON Output Preview:</span>
            {exportedJson && (
              <span>{(new Blob([exportedJson]).size / 1024).toFixed(1)} KB</span>
            )}
          </div>
          <textarea
            data-testid="export-preview-textarea"
            readOnly
            value={exportedJson || '// Click "Generate Export JSON" above to preview'}
            className="flex-1 w-full rounded border border-[#1e293b] bg-[#090d16] p-2.5 font-mono text-[11px] text-[#38bdf8] focus:outline-none resize-none"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex justify-between items-center border-t border-[#1e293b] bg-[#0e1322] px-4 py-2.5">
          <span className="text-[11px] text-[#64748b]">
            Compatible with Postman v2.1.0 import
          </span>
          <div className="flex gap-2">
            <button
              data-testid="export-copy-btn"
              onClick={handleCopy}
              disabled={!exportedJson}
              className="flex items-center gap-1 rounded border border-[#1e293b] bg-[#131b2e] px-3 py-1.5 text-white hover:bg-[#1e293b] disabled:opacity-40 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#10b981]" />
                  <span className="text-[#10b981]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[#94a3b8]" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              data-testid="export-download-btn"
              onClick={handleDownload}
              disabled={!exportedJson}
              className="flex items-center gap-1 rounded bg-[#10b981] px-3 py-1.5 font-semibold text-white hover:bg-[#059669] disabled:opacity-40 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
