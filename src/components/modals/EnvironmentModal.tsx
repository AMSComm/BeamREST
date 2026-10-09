import React, { useState } from 'react'
import {
  X,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'
import { Variable } from '../../types'


export const EnvironmentModal: React.FC = () => {
  const {
    workspace,
    activeProjectId,
    isEnvModalOpen,
    setEnvModalOpen,
    saveEnvironment,
    saveProject,
  } = useWorkspaceStore()

  const [activeTab, setActiveTab] = useState<'project' | 'environment' | 'workspace'>('project')
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({})

  if (!isEnvModalOpen || !workspace) return null

  const activeProject = workspace.projects.find((p) => p.id === activeProjectId)
  const activeEnvironment = workspace.environments.find(
    (e) => e.id === workspace.meta.active_environment_id
  ) || workspace.environments[0]

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Handle Project Variables
  const handleAddProjectVar = () => {
    if (!activeProject) return
    const updated: Variable = {
      key: '',
      value: '',
      is_secret: false,
      scope: 'project',
    }
    saveProject({ ...activeProject, variables: [...activeProject.variables, updated] })
  }

  const handleUpdateProjectVar = (index: number, patch: Partial<Variable>) => {
    if (!activeProject) return
    const updatedVars = activeProject.variables.map((v, i) =>
      i === index ? { ...v, ...patch } : v
    )
    saveProject({ ...activeProject, variables: updatedVars })
  }

  const handleDeleteProjectVar = (index: number) => {
    if (!activeProject) return
    const updatedVars = activeProject.variables.filter((_, i) => i !== index)
    saveProject({ ...activeProject, variables: updatedVars })
  }

  // Handle Environment Variables
  const handleAddEnvVar = () => {
    if (!activeEnvironment) return
    const updated: Variable = {
      key: '',
      value: '',
      is_secret: false,
      scope: 'environment',
    }
    saveEnvironment({
      ...activeEnvironment,
      variables: [...activeEnvironment.variables, updated],
    })
  }

  const handleUpdateEnvVar = (index: number, patch: Partial<Variable>) => {
    if (!activeEnvironment) return
    const updatedVars = activeEnvironment.variables.map((v, i) =>
      i === index ? { ...v, ...patch } : v
    )
    saveEnvironment({ ...activeEnvironment, variables: updatedVars })
  }

  const handleDeleteEnvVar = (index: number) => {
    if (!activeEnvironment) return
    const updatedVars = activeEnvironment.variables.filter((_, i) => i !== index)
    saveEnvironment({ ...activeEnvironment, variables: updatedVars })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-xs select-none">
      <div className="flex h-[520px] w-[700px] flex-col rounded-lg border border-[#1e293b] bg-[#0b0f19] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1e293b] bg-[#0e1322] px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#38bdf8]" />
            <span className="font-semibold text-white">Variable & Secret Manager</span>
          </div>
          <button
            onClick={() => setEnvModalOpen(false)}
            className="rounded p-1 text-[#64748b] hover:bg-[#1e293b] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scope Tabs */}
        <div className="flex border-b border-[#1e293b] bg-[#080c14] px-4">
          <button
            onClick={() => setActiveTab('project')}
            className={`border-b-2 px-3 py-2 font-medium capitalize transition-colors ${
              activeTab === 'project'
                ? 'border-[#38bdf8] text-[#38bdf8]'
                : 'border-transparent text-[#94a3b8] hover:text-[#f8fafc]'
            }`}
          >
            Project Variables ({activeProject?.name || 'None'})
          </button>
          <button
            onClick={() => setActiveTab('environment')}
            className={`border-b-2 px-3 py-2 font-medium capitalize transition-colors ${
              activeTab === 'environment'
                ? 'border-[#38bdf8] text-[#38bdf8]'
                : 'border-transparent text-[#94a3b8] hover:text-[#f8fafc]'
            }`}
          >
            Environment ({activeEnvironment?.name || 'Dev'})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'project' && activeProject && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#94a3b8]">
                  Variables scoped to <strong className="text-white">{activeProject.name}</strong>.
                  Secrets are auto-saved to <code className="text-[#38bdf8]">project.local.json</code> and excluded from Git.
                </span>
                <button
                  onClick={handleAddProjectVar}
                  className="flex items-center gap-1 rounded bg-[#0284c7]/20 border border-[#0284c7]/40 px-2.5 py-1 text-[#38bdf8] hover:bg-[#0284c7]/30 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add Variable
                </button>
              </div>

              <div className="rounded border border-[#1e293b] bg-[#0e1322] divide-y divide-[#1e293b]">
                {activeProject.variables.length === 0 ? (
                  <div className="p-4 text-center text-[#64748b]">No project variables.</div>
                ) : (
                  activeProject.variables.map((v, i) => (
                    <div key={i} className="flex items-center gap-2 p-2">
                      <input
                        type="text"
                        placeholder="Variable Key (e.g. baseUrl)"
                        value={v.key}
                        onChange={(e) => handleUpdateProjectVar(i, { key: e.target.value })}
                        className="w-1/3 rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 font-mono text-white focus:border-[#38bdf8] focus:outline-none"
                      />

                      <div className="relative flex-1">
                        <input
                          type={v.is_secret && !revealedKeys[`proj-${i}`] ? 'password' : 'text'}
                          placeholder="Value"
                          value={v.value}
                          onChange={(e) => handleUpdateProjectVar(i, { value: e.target.value })}
                          className="w-full rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 pr-7 font-mono text-white focus:border-[#38bdf8] focus:outline-none"
                        />
                        {v.is_secret && (
                          <button
                            onClick={() => toggleReveal(`proj-${i}`)}
                            className="absolute right-2 top-1.5 text-[#64748b] hover:text-white"
                          >
                            {revealedKeys[`proj-${i}`] ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      <label className="flex items-center gap-1 text-[11px] text-[#cbd5e1] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={v.is_secret}
                          onChange={(e) =>
                            handleUpdateProjectVar(i, { is_secret: e.target.checked })
                          }
                          className="accent-[#0ea5e9]"
                        />
                        <span>Secret</span>
                      </label>

                      <button
                        onClick={() => handleDeleteProjectVar(i)}
                        className="p-1 text-[#64748b] hover:text-[#ef4444]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'environment' && activeEnvironment && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#94a3b8]">
                  Variables for environment <strong className="text-white">{activeEnvironment.name}</strong>.
                  Secrets stored in <code className="text-[#38bdf8]">{activeEnvironment.name}.env.local.json</code>.
                </span>
                <button
                  onClick={handleAddEnvVar}
                  className="flex items-center gap-1 rounded bg-[#0284c7]/20 border border-[#0284c7]/40 px-2.5 py-1 text-[#38bdf8] hover:bg-[#0284c7]/30 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add Variable
                </button>
              </div>

              <div className="rounded border border-[#1e293b] bg-[#0e1322] divide-y divide-[#1e293b]">
                {activeEnvironment.variables.length === 0 ? (
                  <div className="p-4 text-center text-[#64748b]">No environment variables.</div>
                ) : (
                  activeEnvironment.variables.map((v, i) => (
                    <div key={i} className="flex items-center gap-2 p-2">
                      <input
                        type="text"
                        placeholder="Variable Key (e.g. apiKey)"
                        value={v.key}
                        onChange={(e) => handleUpdateEnvVar(i, { key: e.target.value })}
                        className="w-1/3 rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 font-mono text-white focus:border-[#38bdf8] focus:outline-none"
                      />

                      <div className="relative flex-1">
                        <input
                          type={v.is_secret && !revealedKeys[`env-${i}`] ? 'password' : 'text'}
                          placeholder="Value"
                          value={v.value}
                          onChange={(e) => handleUpdateEnvVar(i, { value: e.target.value })}
                          className="w-full rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 pr-7 font-mono text-white focus:border-[#38bdf8] focus:outline-none"
                        />
                        {v.is_secret && (
                          <button
                            onClick={() => toggleReveal(`env-${i}`)}
                            className="absolute right-2 top-1.5 text-[#64748b] hover:text-white"
                          >
                            {revealedKeys[`env-${i}`] ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      <label className="flex items-center gap-1 text-[11px] text-[#cbd5e1] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={v.is_secret}
                          onChange={(e) =>
                            handleUpdateEnvVar(i, { is_secret: e.target.checked })
                          }
                          className="accent-[#0ea5e9]"
                        />
                        <span>Secret</span>
                      </label>

                      <button
                        onClick={() => handleDeleteEnvVar(i)}
                        className="p-1 text-[#64748b] hover:text-[#ef4444]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end border-t border-[#1e293b] bg-[#0e1322] px-4 py-2.5">
          <button
            onClick={() => setEnvModalOpen(false)}
            className="rounded bg-[#0284c7] px-4 py-1.5 font-semibold text-white hover:bg-[#0369a1] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
