import React, { useState } from 'react'
import {
  Folder,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  FolderPlus,
} from 'lucide-react'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30',
  POST: 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30',
  PUT: 'text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/30',
  DELETE: 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30',
  PATCH: 'text-[#8b5cf6] bg-[#8b5cf6]/10 border-[#8b5cf6]/30',
  HEAD: 'text-[#94a3b8] bg-[#94a3b8]/10 border-[#94a3b8]/30',
  OPTIONS: 'text-[#94a3b8] bg-[#94a3b8]/10 border-[#94a3b8]/30',
}

export const Sidebar: React.FC = () => {
  const {
    workspace,
    activeProjectId,
    activeRequestId,
    selectRequest,
    createProject,
    createRequest,
    deleteRequest,
  } = useWorkspaceStore()

  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({})

  const toggleCollapse = (id: string) => {
    setCollapsedProjects((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleCreateProject = async () => {
    const name = prompt('Enter new project / collection name:')
    if (name && name.trim()) {
      await createProject(name.trim())
    }
  }

  const handleCreateRequest = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const name = prompt('Enter request name:', 'New Request')
    if (name && name.trim()) {
      await createRequest(projectId, name.trim(), 'GET')
    }
  }

  const handleDeleteRequest = async (
    projectId: string,
    requestId: string,
    name: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation()
    if (confirm(`Delete request "${name}"?`)) {
      await deleteRequest(projectId, requestId)
    }
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-[#1e293b] bg-[#080c14] text-xs select-none">
      {/* Sidebar Header */}
      <div className="flex h-10 items-center justify-between border-b border-[#1e293b] px-3">
        <span className="font-semibold uppercase tracking-wider text-[#64748b]">
          Projects & Requests
        </span>
        <button
          onClick={handleCreateProject}
          className="flex items-center gap-1 rounded bg-[#131b2e] px-2 py-0.5 text-[#38bdf8] hover:bg-[#1e293b] transition-colors"
          title="Create New Project"
        >
          <FolderPlus className="h-3 w-3" />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {!workspace || workspace.projects.length === 0 ? (
          <div className="p-4 text-center text-[#64748b]">
            <Folder className="mx-auto mb-2 h-8 w-8 text-[#1e293b]" />
            <p>No projects yet.</p>
            <p className="mt-1 text-[11px] text-[#475569]">Click "New Project" to start.</p>
          </div>
        ) : (
          workspace.projects.map((project) => {
            const isCollapsed = collapsedProjects[project.id]
            const isProjectActive = activeProjectId === project.id

            return (
              <div key={project.id} className="rounded border border-[#162033] bg-[#0b0f19]">
                {/* Project Header */}
                <div
                  onClick={() => toggleCollapse(project.id)}
                  className={`group flex items-center justify-between px-2.5 py-1.5 cursor-pointer rounded hover:bg-[#131b2e] transition-colors ${
                    isProjectActive ? 'border-l-2 border-[#0ea5e9]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5 text-[#64748b]" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-[#64748b]" />
                    )}
                    <Folder className="h-3.5 w-3.5 text-[#38bdf8]" />
                    <span className="font-medium text-[#f8fafc] truncate">
                      {project.name}
                    </span>
                    <span className="rounded-full bg-[#1e293b] px-1.5 py-0.2 text-[10px] text-[#94a3b8]">
                      {project.requests.length}
                    </span>
                  </div>

                  {/* Add Request to Project Button */}
                  <button
                    onClick={(e) => handleCreateRequest(project.id, e)}
                    className="opacity-0 group-hover:opacity-100 rounded p-1 text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#38bdf8] transition-all"
                    title="Add Request to this project"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {/* Requests List */}
                {!isCollapsed && (
                  <div className="ml-3 border-l border-[#1e293b] pl-1.5 py-1 space-y-0.5">
                    {project.requests.length === 0 ? (
                      <div className="py-1 px-2 text-[11px] text-[#475569] italic">
                        Empty project
                      </div>
                    ) : (
                      project.requests.map((req) => {
                        const isReqActive =
                          activeProjectId === project.id && activeRequestId === req.id
                        const methodStyle =
                          METHOD_COLORS[req.method.toUpperCase()] ||
                          'text-[#94a3b8] bg-[#1e293b]'

                        return (
                          <div
                            key={req.id}
                            onClick={() => selectRequest(project.id, req.id)}
                            className={`group flex items-center justify-between rounded px-2 py-1.5 cursor-pointer transition-colors ${
                              isReqActive
                                ? 'bg-[#1e293b] text-white font-medium'
                                : 'text-[#94a3b8] hover:bg-[#131b2e] hover:text-[#f8fafc]'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className={`rounded border px-1 py-0.2 text-[9px] font-mono font-bold tracking-tight uppercase ${methodStyle}`}
                              >
                                {req.method}
                              </span>
                              <span className="truncate">{req.name}</span>
                            </div>

                            <button
                              onClick={(e) =>
                                handleDeleteRequest(project.id, req.id, req.name, e)
                              }
                              className="opacity-0 group-hover:opacity-100 rounded p-1 text-[#64748b] hover:bg-[#0f172a] hover:text-[#ef4444] transition-all"
                              title="Delete Request"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
