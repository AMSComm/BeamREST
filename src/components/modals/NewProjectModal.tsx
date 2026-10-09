import React, { useState } from 'react'
import { X, FolderPlus } from 'lucide-react'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'

export const NewProjectModal: React.FC = () => {
  const { isNewProjectModalOpen, setNewProjectModalOpen, createProject } =
    useWorkspaceStore()
  const [name, setName] = useState('')

  if (!isNewProjectModalOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await createProject(name.trim())
    setName('')
    setNewProjectModalOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-xs select-none">
      <div className="w-[420px] rounded-lg border border-[#1e293b] bg-[#0b0f19] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#1e293b] bg-[#0e1322] px-4 py-3">
          <div className="flex items-center gap-2 text-white font-semibold">
            <FolderPlus className="h-4 w-4 text-[#38bdf8]" />
            <span>Create New Project</span>
          </div>
          <button
            onClick={() => setNewProjectModalOpen(false)}
            className="rounded p-1 text-[#64748b] hover:bg-[#1e293b] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block mb-1.5 text-[#94a3b8] font-medium">
              Project / Collection Name
            </label>
            <input
              type="text"
              autoFocus
              placeholder="e.g. Authentication Service"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-[#1e293b] bg-[#131b2e] px-3 py-2 text-white placeholder-[#64748b] focus:border-[#38bdf8] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#1e293b]">
            <button
              type="button"
              onClick={() => setNewProjectModalOpen(false)}
              className="rounded border border-[#1e293b] bg-[#131b2e] px-3 py-1.5 text-[#cbd5e1] hover:bg-[#1e293b]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="rounded bg-[#0284c7] px-4 py-1.5 font-semibold text-white hover:bg-[#0369a1] disabled:opacity-50"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
