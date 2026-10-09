import React, { useState } from 'react'
import { X, PlusCircle } from 'lucide-react'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

export const NewRequestModal: React.FC = () => {
  const {
    workspace,
    isNewRequestModalOpen,
    targetProjectIdForNewRequest,
    setNewRequestModalOpen,
    createRequest,
  } = useWorkspaceStore()

  const [name, setName] = useState('')
  const [method, setMethod] = useState('GET')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  // Sync selected project with target
  React.useEffect(() => {
    if (targetProjectIdForNewRequest) {
      setSelectedProjectId(targetProjectIdForNewRequest)
    } else if (workspace?.projects.length) {
      setSelectedProjectId(workspace.projects[0].id)
    }
  }, [targetProjectIdForNewRequest, workspace])

  if (!isNewRequestModalOpen || !workspace) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !selectedProjectId) return
    await createRequest(selectedProjectId, name.trim(), method)
    setName('')
    setNewRequestModalOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-xs select-none">
      <div className="w-[440px] rounded-lg border border-[#1e293b] bg-[#0b0f19] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#1e293b] bg-[#0e1322] px-4 py-3">
          <div className="flex items-center gap-2 text-white font-semibold">
            <PlusCircle className="h-4 w-4 text-[#10b981]" />
            <span>Create New Request</span>
          </div>
          <button
            onClick={() => setNewRequestModalOpen(false)}
            className="rounded p-1 text-[#64748b] hover:bg-[#1e293b] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block mb-1 text-[#94a3b8] font-medium">Target Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full rounded border border-[#1e293b] bg-[#131b2e] px-3 py-1.5 text-white focus:border-[#38bdf8] focus:outline-none"
            >
              {workspace.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <div className="w-1/3">
              <label className="block mb-1 text-[#94a3b8] font-medium">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full rounded border border-[#1e293b] bg-[#131b2e] px-2.5 py-1.5 font-mono font-bold text-[#38bdf8] focus:border-[#38bdf8] focus:outline-none"
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block mb-1 text-[#94a3b8] font-medium">Request Name</label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Get User Profile"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-[#1e293b] bg-[#131b2e] px-3 py-1.5 text-white placeholder-[#64748b] focus:border-[#38bdf8] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#1e293b]">
            <button
              type="button"
              onClick={() => setNewRequestModalOpen(false)}
              className="rounded border border-[#1e293b] bg-[#131b2e] px-3 py-1.5 text-[#cbd5e1] hover:bg-[#1e293b]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="rounded bg-[#0284c7] px-4 py-1.5 font-semibold text-white hover:bg-[#0369a1] disabled:opacity-50"
            >
              Create Request
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
