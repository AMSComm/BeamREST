import React, { useState } from 'react'
import {
  Folder,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  FolderPlus,
  Edit2,
  Check,
  Clock,
} from 'lucide-react'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'
import { BeamRequest } from '../../types'

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
    isRequestDirty,
    renameProject,
    renameRequest,
    setNewProjectModalOpen,
    openNewRequestModal,
    openConfirmDelete,
    recentRequests,
    clearRecentRequests,
  } = useWorkspaceStore()

  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({})
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingProjectName, setEditingProjectName] = useState<string>('')
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null)
  const [editingRequestName, setEditingRequestName] = useState<string>('')

  const toggleCollapse = (id: string) => {
    setCollapsedProjects((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleCreateRequest = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    openNewRequestModal(projectId)
  }

  const handleStartProjectRename = (
    project: { id: string; name: string },
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation()
    setEditingProjectId(project.id)
    setEditingProjectName(project.name)
  }

  const handleSaveProjectRename = async (projectId: string) => {
    const trimmed = editingProjectName.trim()
    if (trimmed) {
      await renameProject(projectId, trimmed)
    }
    setEditingProjectId(null)
  }

  const handleStartRename = (req: BeamRequest, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditingRequestId(req.id)
    setEditingRequestName(req.name)
  }

  const handleSaveRename = async (projectId: string, reqId: string) => {
    const trimmed = editingRequestName.trim()
    if (trimmed) {
      await renameRequest(projectId, reqId, trimmed)
    }
    setEditingRequestId(null)
  }

  const handleDeleteRequest = (
    projectId: string,
    requestId: string,
    name: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation()
    openConfirmDelete({ type: 'request', projectId, requestId, name })
  }

  const handleDeleteProject = (
    projectId: string,
    name: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation()
    openConfirmDelete({ type: 'project', projectId, name })
  }

  return (
    <aside className="flex h-full w-full flex-col bg-[#080c14] text-xs select-none">
      {/* Sidebar Header */}
      <div className="flex h-10 items-center justify-between border-b border-[#1e293b] px-3">
        <span className="font-semibold uppercase tracking-wider text-[#64748b]">
          Projects & Requests
        </span>
        <button
          data-testid="sidebar-new-project-btn"
          onClick={() => setNewProjectModalOpen(true)}
          className="flex items-center gap-1 rounded bg-[#131b2e] px-2 py-0.5 text-[#38bdf8] hover:bg-[#1e293b] transition-colors"
          title="Create New Project (Cmd+Shift+N)"
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
              <div key={project.id} data-testid={`sidebar-project-${project.id}`} className="rounded border border-[#162033] bg-[#0b0f19]">
                {/* Project Header */}
                <div
                  data-testid={`sidebar-project-header-${project.id}`}
                  onClick={() => toggleCollapse(project.id)}
                  className={`group flex items-center justify-between px-2.5 py-1.5 cursor-pointer rounded hover:bg-[#131b2e] transition-colors ${
                    isProjectActive ? 'border-l-2 border-[#0ea5e9]' : ''
                  }`}
                >
                  {editingProjectId === project.id ? (
                    <div
                      className="flex items-center gap-1 w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        data-testid={`sidebar-rename-project-input-${project.id}`}
                        type="text"
                        autoFocus
                        value={editingProjectName}
                        onChange={(e) => setEditingProjectName(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            await handleSaveProjectRename(project.id)
                          } else if (e.key === 'Escape') {
                            setEditingProjectId(null)
                          }
                        }}
                        onBlur={async () => {
                          await handleSaveProjectRename(project.id)
                        }}
                        className="w-full rounded border border-[#38bdf8] bg-[#131b2e] px-1.5 py-0.5 text-xs text-white focus:outline-none"
                      />
                      <button
                        data-testid={`sidebar-save-project-rename-btn-${project.id}`}
                        onMouseDown={async (e) => {
                          e.preventDefault()
                          await handleSaveProjectRename(project.id)
                        }}
                        className="rounded p-1 text-[#10b981] hover:bg-[#1e293b] cursor-pointer"
                        title="Save Project Name"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        className="flex items-center gap-2 truncate flex-1"
                        onDoubleClick={(e) => handleStartProjectRename(project, e)}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-3.5 w-3.5 text-[#64748b] shrink-0" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-[#64748b] shrink-0" />
                        )}
                        <Folder className="h-3.5 w-3.5 text-[#38bdf8] shrink-0" />
                        <span className="font-medium text-[#f8fafc] truncate" title={project.name}>
                          {project.name}
                        </span>
                        <span className="rounded-full bg-[#1e293b] px-1.5 py-0.2 text-[10px] text-[#94a3b8] shrink-0">
                          {project.requests.length}
                        </span>
                      </div>

                      {/* Actions for Project */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        <button
                          data-testid={`sidebar-add-request-btn-${project.id}`}
                          onClick={(e) => handleCreateRequest(project.id, e)}
                          className="rounded p-1 text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#38bdf8] transition-all cursor-pointer"
                          title="Add Request to this project"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          data-testid={`sidebar-rename-project-btn-${project.id}`}
                          onClick={(e) => handleStartProjectRename(project, e)}
                          className="rounded p-1 text-[#64748b] hover:bg-[#1e293b] hover:text-[#38bdf8] transition-all cursor-pointer"
                          title="Rename Project"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          data-testid={`sidebar-delete-project-btn-${project.id}`}
                          onClick={(e) => handleDeleteProject(project.id, project.name, e)}
                          className="rounded p-1 text-[#64748b] hover:bg-[#1e293b] hover:text-[#ef4444] transition-all cursor-pointer"
                          title="Delete Project"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  )}
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
                            data-testid={`sidebar-request-${req.id}`}
                            onClick={() => selectRequest(project.id, req.id)}
                            className={`group flex items-center justify-between rounded px-2 py-1.5 cursor-pointer transition-colors ${
                              isReqActive
                                ? 'bg-[#1e293b] text-white font-medium'
                                : 'text-[#94a3b8] hover:bg-[#131b2e] hover:text-[#f8fafc]'
                            }`}
                          >
                            {editingRequestId === req.id ? (
                              <div
                                className="flex items-center gap-1 w-full"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  data-testid={`sidebar-rename-input-${req.id}`}
                                  type="text"
                                  autoFocus
                                  value={editingRequestName}
                                  onChange={(e) => setEditingRequestName(e.target.value)}
                                  onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                      await handleSaveRename(project.id, req.id)
                                    } else if (e.key === 'Escape') {
                                      setEditingRequestId(null)
                                    }
                                  }}
                                  onBlur={async () => {
                                    await handleSaveRename(project.id, req.id)
                                  }}
                                  className="w-full rounded border border-[#38bdf8] bg-[#131b2e] px-1.5 py-0.5 text-xs text-white focus:outline-none"
                                />
                                <button
                                  data-testid={`sidebar-save-rename-btn-${req.id}`}
                                  onMouseDown={async (e) => {
                                    e.preventDefault()
                                    await handleSaveRename(project.id, req.id)
                                  }}
                                  className="rounded p-1 text-[#10b981] hover:bg-[#1e293b] cursor-pointer"
                                  title="Save Name"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div
                                  className="flex items-center gap-2 truncate flex-1"
                                  onDoubleClick={(e) => handleStartRename(req, e)}
                                >
                                  <span
                                    className={`rounded border px-1 py-0.2 text-[9px] font-mono font-bold tracking-tight uppercase ${methodStyle}`}
                                  >
                                    {req.method}
                                  </span>
                                  <span className="truncate" title={req.name}>{req.name}</span>
                                  {isRequestDirty(req.id) && (
                                    <span
                                      data-testid={`sidebar-unsaved-dot-${req.id}`}
                                      className="h-1.5 w-1.5 rounded-full bg-[#38bdf8] shrink-0"
                                      title="Unsaved changes"
                                    />
                                  )}
                                </div>

                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                  <button
                                    data-testid={`sidebar-rename-request-btn-${req.id}`}
                                    onClick={(e) => handleStartRename(req, e)}
                                    className="rounded p-1 text-[#64748b] hover:bg-[#0f172a] hover:text-[#38bdf8] transition-all cursor-pointer"
                                    title="Rename Request"
                                  >
                                    <Edit2 className="h-2.5 w-2.5" />
                                  </button>
                                  <button
                                    data-testid={`sidebar-delete-request-btn-${req.id}`}
                                    onClick={(e) =>
                                      handleDeleteRequest(project.id, req.id, req.name, e)
                                    }
                                    className="rounded p-1 text-[#64748b] hover:bg-[#0f172a] hover:text-[#ef4444] transition-all cursor-pointer"
                                    title="Delete Request"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              </>
                            )}
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

      {/* Recent Requests Section */}
      <div
        data-testid="sidebar-recent-requests-section"
        className="border-t border-[#1e293b] bg-[#090d16] shrink-0 flex flex-col max-h-[40%]"
      >
        <div className="flex h-8 items-center justify-between px-3 text-[#64748b] shrink-0 border-b border-[#162033]/60">
          <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[11px] text-[#94a3b8]">
            <Clock className="h-3.5 w-3.5 text-[#38bdf8]" />
            <span>Recent Requests</span>
            {recentRequests.length > 0 && (
              <span
                data-testid="sidebar-recent-requests-count"
                className="rounded-full bg-[#1e293b] px-1.5 py-0.2 text-[10px] text-[#94a3b8]"
              >
                {recentRequests.length}
              </span>
            )}
          </div>
          {recentRequests.length > 0 && (
            <button
              data-testid="sidebar-clear-recent-requests-btn"
              onClick={clearRecentRequests}
              className="rounded p-1 text-[#64748b] hover:bg-[#1e293b] hover:text-[#ef4444] transition-colors cursor-pointer"
              title="Clear Recent Requests"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>

        <div
          data-testid="sidebar-recent-requests-list"
          className="overflow-y-auto p-1.5 space-y-0.5 max-h-48"
        >
          {recentRequests.length === 0 ? (
            <div className="py-2.5 text-center text-[11px] text-[#475569]">
              No recent requests
            </div>
          ) : (
            recentRequests.map((item) => {
              const isItemActive = activeRequestId === item.request_id
              const methodStyle = METHOD_COLORS[item.method] || 'text-white'
              return (
                <div
                  key={`${item.project_id}-${item.request_id}`}
                  data-testid={`sidebar-recent-request-${item.request_id}`}
                  onClick={() => {
                    setCollapsedProjects((prev) => ({ ...prev, [item.project_id]: false }))
                    selectRequest(item.project_id, item.request_id)
                  }}
                  className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
                    isItemActive
                      ? 'bg-[#131b2e] text-white border-l-2 border-[#0ea5e9]'
                      : 'text-[#94a3b8] hover:bg-[#0f172a] hover:text-[#f8fafc]'
                  }`}
                  title={`${item.method} ${item.request_name} (${item.project_name})`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    <span
                      className={`rounded border px-1 py-0.2 text-[9px] font-mono font-bold tracking-tight uppercase shrink-0 ${methodStyle}`}
                    >
                      {item.method}
                    </span>
                    <span className="truncate text-xs font-medium text-[#f8fafc]">
                      {item.request_name}
                    </span>
                    <span className="truncate text-[10px] text-[#64748b]">
                      · {item.project_name}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </aside>
  )
}
