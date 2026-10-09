import React, { useState } from 'react'
import {
  FolderOpen,
  PlusCircle,
  Download,
  Settings,
  Layers,
  Zap,
  Keyboard,
  Edit2,
  Check,
  Globe,
} from 'lucide-react'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'
import { isTauri } from '../../services/tauriApi'

export const Header: React.FC = () => {
  const {
    workspace,
    loadWorkspace,
    renameWorkspace,
    proxy,
    setProxyModalOpen,
    setActiveEnvironment,
    setWorkspaceModalOpen,
    setEnvModalOpen,
    setExportModalOpen,
    setShortcutsModalOpen,
  } = useWorkspaceStore()

  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')

  const handleOpenFolder = async () => {
    try {
      if (isTauri()) {
        const selected = await openDialog({
          directory: true,
          multiple: false,
          title: 'Select Workspace Directory',
        })
        if (selected && typeof selected === 'string') {
          await loadWorkspace(selected)
          return
        }
      }
    } catch {
      // Fallback if plugin dialog not supported or cancelled
    }

    const input = prompt(
      'Enter directory path to open as workspace:',
      workspace?.path || ''
    )
    if (input && input.trim()) {
      await loadWorkspace(input.trim())
    }
  }

  const handleNewWorkspace = () => {
    setWorkspaceModalOpen(true)
  }

  return (
    <header className="flex h-11 items-center justify-between border-b border-[#1e293b] bg-[#080c14] px-4 text-xs select-none">
      {/* Brand & Workspace Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-semibold tracking-wide text-white">
          <div className="relative flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-tr from-[#0ea5e9] to-[#06b6d4] shadow-sm shadow-[#06b6d4]/30">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">
            Beam<span className="text-[#38bdf8]">REST</span>
          </span>
        </div>

        <div className="h-4 w-px bg-[#1e293b]" />

        <div className="flex items-center gap-1.5 text-[#94a3b8]">
          <Layers className="h-3.5 w-3.5 text-[#64748b]" />
          {isEditingName ? (
            <div className="flex items-center gap-1">
              <input
                data-testid="header-workspace-name-input"
                type="text"
                autoFocus
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (editedName.trim()) {
                      await renameWorkspace(editedName.trim())
                    }
                    setIsEditingName(false)
                  } else if (e.key === 'Escape') {
                    setIsEditingName(false)
                  }
                }}
                className="rounded border border-[#38bdf8] bg-[#131b2e] px-2 py-0.5 text-xs text-white focus:outline-none"
              />
              <button
                data-testid="header-save-ws-name-btn"
                onClick={async () => {
                  if (editedName.trim()) {
                    await renameWorkspace(editedName.trim())
                  }
                  setIsEditingName(false)
                }}
                className="rounded p-1 text-[#10b981] hover:bg-[#1e293b]"
                title="Save Name"
              >
                <Check className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group">
              <span
                data-testid="header-workspace-name"
                className="max-w-[200px] truncate font-medium text-[#f8fafc]"
              >
                {workspace?.meta.name || 'No Workspace Loaded'}
              </span>
              {workspace && (
                <button
                  data-testid="header-rename-ws-btn"
                  onClick={() => {
                    setEditedName(workspace.meta.name)
                    setIsEditingName(true)
                  }}
                  className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-[#64748b] hover:text-[#38bdf8] transition-all"
                  title="Rename Workspace"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions & Environment Switcher */}
      <div className="flex items-center gap-2">
        {/* Proxy Settings Button */}
        <button
          data-testid="header-proxy-btn"
          onClick={() => setProxyModalOpen(true)}
          className={`flex items-center gap-1.5 rounded border px-2.5 py-1 transition-colors ${
            proxy.enabled
              ? 'border-[#0284c7]/50 bg-[#0284c7]/20 text-[#38bdf8] hover:bg-[#0284c7]/30'
              : 'border-[#1e293b] bg-[#131b2e] text-[#94a3b8] hover:border-[#38bdf8]/40 hover:text-white'
          }`}
          title="Configure HTTP/SOCKS Proxy"
        >
          <Globe className={`h-3.5 w-3.5 ${proxy.enabled ? 'text-[#38bdf8]' : 'text-[#64748b]'}`} />
          <span>Proxy:</span>
          <span className={`font-mono text-[10px] font-bold ${proxy.enabled ? 'text-[#38bdf8]' : 'text-[#64748b]'}`}>
            {proxy.enabled ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Environment Picker */}
        {workspace && (
          <div className="flex items-center gap-1.5 rounded border border-[#1e293b] bg-[#0f172a] px-2 py-1">
            <span className="text-[#64748b]">Env:</span>
            <select
              data-testid="header-env-select"
              className="bg-transparent text-[#38bdf8] outline-none cursor-pointer text-xs"
              value={workspace.meta.active_environment_id || ''}
              onChange={(e) => setActiveEnvironment(e.target.value || null)}
            >
              <option value="" className="bg-[#0f172a] text-[#94a3b8]">
                No Environment
              </option>
              {workspace.environments.map((env) => (
                <option key={env.id} value={env.id} className="bg-[#0f172a] text-[#f8fafc]">
                  {env.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Variables Manager Button */}
        {workspace && (
          <button
            data-testid="header-variables-btn"
            onClick={() => setEnvModalOpen(true)}
            className="flex items-center gap-1.5 rounded border border-[#1e293b] bg-[#131b2e] px-2.5 py-1 text-[#cbd5e1] hover:border-[#38bdf8]/50 hover:bg-[#1e293b] hover:text-white transition-colors"
            title="Manage Workspace & Environment Variables (Cmd+E)"
          >
            <Settings className="h-3.5 w-3.5 text-[#38bdf8]" />
            <span>Variables</span>
          </button>
        )}

        {/* Export Postman / Project Button */}
        {workspace && (
          <button
            data-testid="header-export-btn"
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-1.5 rounded border border-[#1e293b] bg-[#131b2e] px-2.5 py-1 text-[#cbd5e1] hover:border-[#38bdf8]/50 hover:bg-[#1e293b] hover:text-white transition-colors"
            title="Export to Postman Collection or Project (Cmd+Shift+E)"
          >
            <Download className="h-3.5 w-3.5 text-[#10b981]" />
            <span>Export</span>
          </button>
        )}

        {/* Shortcuts Cheat Sheet Button */}
        <button
          data-testid="header-shortcuts-btn"
          onClick={() => setShortcutsModalOpen(true)}
          className="flex items-center gap-1 rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 text-[#94a3b8] hover:border-[#38bdf8]/50 hover:text-white transition-colors"
          title="Keyboard Shortcuts Cheat Sheet (?)"
        >
          <Keyboard className="h-3.5 w-3.5 text-[#38bdf8]" />
        </button>

        {/* Workspace Load & New Buttons */}
        <button
          data-testid="header-open-btn"
          onClick={handleOpenFolder}
          className="flex items-center gap-1.5 rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 text-[#94a3b8] hover:border-[#334155] hover:text-white transition-colors"
          title="Open Existing Workspace Directory (Cmd+O)"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span>Open</span>
        </button>

        <button
          data-testid="header-new-ws-btn"
          onClick={handleNewWorkspace}
          className="flex items-center gap-1.5 rounded border border-[#0284c7]/40 bg-[#0284c7]/20 px-2 py-1 text-[#38bdf8] hover:bg-[#0284c7]/30 transition-colors"
          title="Create New Workspace"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>New</span>
        </button>
      </div>
    </header>
  )
}
