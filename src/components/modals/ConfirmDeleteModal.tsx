import React from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'

export const ConfirmDeleteModal: React.FC = () => {
  const {
    confirmDeleteTarget,
    closeConfirmDelete,
    deleteRequest,
    deleteProject,
    deleteEnvironment,
  } = useWorkspaceStore()

  if (!confirmDeleteTarget) return null

  const handleConfirm = async () => {
    if (confirmDeleteTarget.type === 'request') {
      if (confirmDeleteTarget.projectId && confirmDeleteTarget.requestId) {
        await deleteRequest(
          confirmDeleteTarget.projectId,
          confirmDeleteTarget.requestId
        )
      }
    } else if (confirmDeleteTarget.type === 'project') {
      if (confirmDeleteTarget.projectId) {
        await deleteProject(confirmDeleteTarget.projectId)
      }
    } else if (confirmDeleteTarget.type === 'environment') {
      if (confirmDeleteTarget.envId) {
        await deleteEnvironment(confirmDeleteTarget.envId)
      }
    }
    closeConfirmDelete()
  }

  const getTargetDescription = () => {
    switch (confirmDeleteTarget.type) {
      case 'project':
        return {
          title: `Are you sure you want to delete project "${confirmDeleteTarget.name}"?`,
          warning: 'This will permanently remove the project folder and all its .request.json files from disk.',
        }
      case 'environment':
        return {
          title: `Are you sure you want to delete environment "${confirmDeleteTarget.name}"?`,
          warning: 'This will remove the .env.json and .env.local.json files from disk.',
        }
      case 'request':
      default:
        return {
          title: `Are you sure you want to delete request "${confirmDeleteTarget.name}"?`,
          warning: 'This will permanently remove the .request.json file from disk.',
        }
    }
  }

  const { title, warning } = getTargetDescription()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-xs select-none">
      <div className="w-[380px] rounded-lg border border-[#ef4444]/40 bg-[#0b0f19] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#1e293b] bg-[#0e1322] px-4 py-3">
          <div className="flex items-center gap-2 text-[#ef4444] font-semibold">
            <AlertTriangle className="h-4 w-4" />
            <span>Confirm Deletion</span>
          </div>
          <button
            onClick={closeConfirmDelete}
            className="rounded p-1 text-[#64748b] hover:bg-[#1e293b] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-[#cbd5e1]">{title}</p>
          <p className="text-[11px] text-[#64748b]">{warning}</p>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#1e293b]">
            <button
              onClick={closeConfirmDelete}
              className="rounded border border-[#1e293b] bg-[#131b2e] px-3 py-1.5 text-[#cbd5e1] hover:bg-[#1e293b]"
            >
              Cancel
            </button>
            <button
              data-testid="confirm-delete-action-btn"
              onClick={handleConfirm}
              className="rounded bg-[#ef4444] px-4 py-1.5 font-semibold text-white hover:bg-[#dc2626]"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
