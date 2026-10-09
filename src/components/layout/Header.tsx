import React from 'react'
import {
  FolderOpen,
  PlusCircle,
  Download,
  Settings,
  Layers,
  Zap,
} from 'lucide-react'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'

export const Header: React.FC = () => {
  const {
    workspace,
    loadWorkspace,
    initWorkspace,
    setActiveEnvironment,
    setEnvModalOpen,
    setExportModalOpen,
  } = useWorkspaceStore()

  const handleOpenFolder = async () => {
    const input = prompt(
      'Enter directory path to open as workspace:',
      workspace?.path || ''
    )
    if (input && input.trim()) {
      await loadWorkspace(input.trim())
    }
  }

  const handleNewWorkspace = async () => {
    const name = prompt('Enter workspace name:', 'My API Workspace')
    if (!name || !name.trim()) return

    const path = prompt(
      'Enter directory path for new workspace:',
      `/Users/huy/dev/beamrest-workspace`
    )
    if (path && path.trim()) {
      await initWorkspace(path.trim(), name.trim())
    }
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
          <span className="max-w-[200px] truncate font-medium text-[#f8fafc]">
            {workspace?.meta.name || 'No Workspace Loaded'}
          </span>
        </div>
      </div>

      {/* Actions & Environment Switcher */}
      <div className="flex items-center gap-2">
        {/* Environment Picker */}
        {workspace && (
          <div className="flex items-center gap-1.5 rounded border border-[#1e293b] bg-[#0f172a] px-2 py-1">
            <span className="text-[#64748b]">Env:</span>
            <select
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
            onClick={() => setEnvModalOpen(true)}
            className="flex items-center gap-1.5 rounded border border-[#1e293b] bg-[#131b2e] px-2.5 py-1 text-[#cbd5e1] hover:border-[#38bdf8]/50 hover:bg-[#1e293b] hover:text-white transition-colors"
            title="Manage Workspace & Environment Variables"
          >
            <Settings className="h-3.5 w-3.5 text-[#38bdf8]" />
            <span>Variables</span>
          </button>
        )}

        {/* Export Postman / Project Button */}
        {workspace && (
          <button
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-1.5 rounded border border-[#1e293b] bg-[#131b2e] px-2.5 py-1 text-[#cbd5e1] hover:border-[#38bdf8]/50 hover:bg-[#1e293b] hover:text-white transition-colors"
            title="Export to Postman Collection or Project"
          >
            <Download className="h-3.5 w-3.5 text-[#10b981]" />
            <span>Export</span>
          </button>
        )}

        {/* Workspace Load & New Buttons */}
        <button
          onClick={handleOpenFolder}
          className="flex items-center gap-1.5 rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 text-[#94a3b8] hover:border-[#334155] hover:text-white transition-colors"
          title="Open Existing Workspace Directory"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span>Open</span>
        </button>

        <button
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
