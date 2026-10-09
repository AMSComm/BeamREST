import React, { useState } from 'react'
import { X, Layers, FolderOpen } from 'lucide-react'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'
import { isTauri } from '../../services/tauriApi'

export const NewWorkspaceModal: React.FC = () => {
  const { isWorkspaceModalOpen, setWorkspaceModalOpen, initWorkspace } =
    useWorkspaceStore()

  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isWorkspaceModalOpen) return null

  const handleBrowseFolder = async () => {
    try {
      if (isTauri()) {
        const selected = await openDialog({
          directory: true,
          multiple: false,
          title: 'Select Directory for New Workspace',
        })
        if (selected && typeof selected === 'string') {
          setPath(selected)
        }
      }
    } catch {
      // ignore
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please provide a workspace name.')
      return
    }
    if (!path.trim()) {
      setError('Please choose a directory path.')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      await initWorkspace(path.trim(), name.trim())
      setName('')
      setPath('')
      setWorkspaceModalOpen(false)
    } catch (err: any) {
      setError(String(err?.message || err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-xs select-none">
      <div className="w-[460px] rounded-lg border border-[#1e293b] bg-[#0b0f19] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#1e293b] bg-[#0e1322] px-4 py-3">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Layers className="h-4 w-4 text-[#38bdf8]" />
            <span>Create New Workspace</span>
          </div>
          <button
            onClick={() => setWorkspaceModalOpen(false)}
            className="rounded p-1 text-[#64748b] hover:bg-[#1e293b] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block mb-1.5 text-[#94a3b8] font-medium">
              Workspace Name
            </label>
            <input
              type="text"
              autoFocus
              placeholder="e.g. My API Workspace"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-[#1e293b] bg-[#131b2e] px-3 py-2 text-white placeholder-[#64748b] focus:border-[#38bdf8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-[#94a3b8] font-medium">
              Directory Path
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. /Users/name/work/api-workspace"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="flex-1 rounded border border-[#1e293b] bg-[#131b2e] px-3 py-2 font-mono text-white placeholder-[#64748b] focus:border-[#38bdf8] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleBrowseFolder}
                className="flex items-center gap-1.5 rounded border border-[#1e293b] bg-[#131b2e] px-3 py-2 text-[#cbd5e1] hover:bg-[#1e293b] hover:text-white transition-colors"
                title="Browse folder"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span>Browse</span>
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-[#64748b]">
              BeamREST will create <code className="text-[#38bdf8]">.beamrest/</code> and an auto-safe <code className="text-[#38bdf8]">.gitignore</code> in this directory.
            </p>
          </div>

          {error && (
            <div className="rounded border border-[#ef4444]/30 bg-[#ef4444]/10 p-2 text-[#ef4444] text-[11px]">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[#1e293b]">
            <button
              type="button"
              onClick={() => setWorkspaceModalOpen(false)}
              className="rounded border border-[#1e293b] bg-[#131b2e] px-3 py-1.5 text-[#cbd5e1] hover:bg-[#1e293b]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-[#0284c7] px-4 py-1.5 font-semibold text-white hover:bg-[#0369a1] disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
