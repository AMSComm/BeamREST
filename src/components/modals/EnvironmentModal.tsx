import React, { useState } from 'react'
import {
  X,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  Check,
} from 'lucide-react'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'
import { Environment, Variable } from '../../types'

export const EnvironmentModal: React.FC = () => {
  const {
    workspace,
    activeProjectId,
    isEnvModalOpen,
    setEnvModalOpen,
    saveEnvironment,
    saveProject,
    saveWorkspaceMeta,
    setActiveEnvironment,
    openConfirmDelete,
  } = useWorkspaceStore()

  const [activeTab, setActiveTab] = useState<'project' | 'environment' | 'workspace'>('project')
  const [selectedEnvId, setSelectedEnvId] = useState<string>('')
  const [isCreatingEnv, setIsCreatingEnv] = useState<boolean>(false)
  const [newEnvName, setNewEnvName] = useState<string>('')
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({})

  if (!isEnvModalOpen || !workspace) return null

  const activeProject = workspace.projects.find((p) => p.id === activeProjectId)

  // Resolve active environment for tab
  const currentEnv =
    workspace.environments.find((e) => e.id === (selectedEnvId || workspace.meta.active_environment_id)) ||
    workspace.environments[0] ||
    null

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

  // Handle Environment Actions
  const handleCreateNewEnvironment = async () => {
    if (!newEnvName.trim()) return
    const newEnv: Environment = {
      id: 'env-' + Date.now(),
      name: newEnvName.trim(),
      variables: [
        {
          key: 'baseUrl',
          value: 'https://api.example.com',
          is_secret: false,
          scope: 'environment',
        },
      ],
    }
    await saveEnvironment(newEnv)
    setSelectedEnvId(newEnv.id)
    setIsCreatingEnv(false)
    setNewEnvName('')
  }

  const handleAddEnvVar = () => {
    if (!currentEnv) return
    const updated: Variable = {
      key: '',
      value: '',
      is_secret: false,
      scope: 'environment',
    }
    saveEnvironment({
      ...currentEnv,
      variables: [...currentEnv.variables, updated],
    })
  }

  const handleUpdateEnvVar = (index: number, patch: Partial<Variable>) => {
    if (!currentEnv) return
    const updatedVars = currentEnv.variables.map((v, i) =>
      i === index ? { ...v, ...patch } : v
    )
    saveEnvironment({ ...currentEnv, variables: updatedVars })
  }

  const handleDeleteEnvVar = (index: number) => {
    if (!currentEnv) return
    const updatedVars = currentEnv.variables.filter((_, i) => i !== index)
    saveEnvironment({ ...currentEnv, variables: updatedVars })
  }

  const handleDeleteCurrentEnvironment = () => {
    if (!currentEnv) return
    openConfirmDelete({
      type: 'environment',
      envId: currentEnv.id,
      name: currentEnv.name,
    })
  }

  // Handle Workspace Variables
  const handleAddWorkspaceVar = () => {
    const updated: Variable = {
      key: '',
      value: '',
      is_secret: false,
      scope: 'workspace',
    }
    saveWorkspaceMeta({
      ...workspace.meta,
      variables: [...workspace.meta.variables, updated],
    })
  }

  const handleUpdateWorkspaceVar = (index: number, patch: Partial<Variable>) => {
    const updatedVars = workspace.meta.variables.map((v, i) =>
      i === index ? { ...v, ...patch } : v
    )
    saveWorkspaceMeta({
      ...workspace.meta,
      variables: updatedVars,
    })
  }

  const handleDeleteWorkspaceVar = (index: number) => {
    const updatedVars = workspace.meta.variables.filter((_, i) => i !== index)
    saveWorkspaceMeta({
      ...workspace.meta,
      variables: updatedVars,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-xs select-none">
      <div className="flex h-[540px] w-[740px] flex-col rounded-lg border border-[#1e293b] bg-[#0b0f19] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1e293b] bg-[#0e1322] px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#38bdf8]" />
            <span className="font-semibold text-white">Variable & Secret Manager</span>
          </div>
          <button
            data-testid="env-close-btn"
            onClick={() => setEnvModalOpen(false)}
            className="rounded p-1 text-[#64748b] hover:bg-[#1e293b] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scope Tabs */}
        <div className="flex border-b border-[#1e293b] bg-[#080c14] px-4">
          <button
            data-testid="env-tab-project"
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
            data-testid="env-tab-environment"
            onClick={() => setActiveTab('environment')}
            className={`border-b-2 px-3 py-2 font-medium capitalize transition-colors ${
              activeTab === 'environment'
                ? 'border-[#38bdf8] text-[#38bdf8]'
                : 'border-transparent text-[#94a3b8] hover:text-[#f8fafc]'
            }`}
          >
            Environment ({currentEnv?.name || 'Dev'})
          </button>
          <button
            data-testid="env-tab-workspace"
            onClick={() => setActiveTab('workspace')}
            className={`border-b-2 px-3 py-2 font-medium capitalize transition-colors ${
              activeTab === 'workspace'
                ? 'border-[#38bdf8] text-[#38bdf8]'
                : 'border-transparent text-[#94a3b8] hover:text-[#f8fafc]'
            }`}
          >
            Workspace Variables (Global)
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* TAB 1: Project Variables */}
          {activeTab === 'project' && activeProject && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#94a3b8]">
                  Variables scoped to <strong className="text-white">{activeProject.name}</strong>.
                  Secret keys are saved with empty values; secret values remain in-memory only and are never saved to disk.
                </span>
                <button
                  data-testid="env-add-project-var-btn"
                  onClick={handleAddProjectVar}
                  className="flex items-center gap-1 rounded bg-[#0284c7]/20 border border-[#0284c7]/40 px-2.5 py-1 text-[#38bdf8] hover:bg-[#0284c7]/30 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add Variable
                </button>
              </div>

              <div className="rounded border border-[#1e293b] bg-[#0e1322] divide-y divide-[#1e293b]">
                {activeProject.variables.length === 0 ? (
                  <div className="p-4 text-center text-[#64748b]">No project variables configured.</div>
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

          {/* TAB 2: Environment Variables */}
          {activeTab === 'environment' && (
            <div>
              {/* Environment Switcher & Creation Toolbar */}
              <div className="flex items-center justify-between gap-2 rounded border border-[#1e293b] bg-[#0e1322] p-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#94a3b8] font-medium">Select Environment:</span>
                  <select
                    value={currentEnv?.id || ''}
                    onChange={(e) => setSelectedEnvId(e.target.value)}
                    className="rounded border border-[#1e293b] bg-[#131b2e] px-2.5 py-1 font-semibold text-[#38bdf8] outline-none cursor-pointer"
                  >
                    {workspace.environments.map((env) => (
                      <option key={env.id} value={env.id}>
                        {env.name} {env.id === workspace.meta.active_environment_id ? '(Active)' : ''}
                      </option>
                    ))}
                  </select>

                  {currentEnv && currentEnv.id !== workspace.meta.active_environment_id && (
                    <button
                      onClick={() => setActiveEnvironment(currentEnv.id)}
                      className="flex items-center gap-1 rounded bg-[#131b2e] border border-[#1e293b] px-2 py-1 text-[#cbd5e1] hover:text-white hover:border-[#38bdf8]"
                      title="Set as currently active environment"
                    >
                      <Check className="h-3 w-3 text-[#10b981]" />
                      <span>Set as Active</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!isCreatingEnv ? (
                    <button
                      onClick={() => setIsCreatingEnv(true)}
                      className="flex items-center gap-1 rounded bg-[#0284c7]/20 border border-[#0284c7]/40 px-2.5 py-1 text-[#38bdf8] hover:bg-[#0284c7]/30 transition-colors"
                    >
                      <Plus className="h-3 w-3" /> New Environment
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Env Name (e.g. Production)"
                        value={newEnvName}
                        onChange={(e) => setNewEnvName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateNewEnvironment()}
                        className="rounded border border-[#38bdf8] bg-[#131b2e] px-2 py-1 text-white text-xs outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleCreateNewEnvironment}
                        className="rounded bg-[#0284c7] px-2 py-1 text-white font-medium hover:bg-[#0369a1]"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setIsCreatingEnv(false)
                          setNewEnvName('')
                        }}
                        className="rounded border border-[#1e293b] px-2 py-1 text-[#94a3b8] hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {currentEnv && workspace.environments.length > 1 && (
                    <button
                      onClick={handleDeleteCurrentEnvironment}
                      className="flex items-center gap-1 rounded border border-[#ef4444]/30 bg-[#ef4444]/10 px-2 py-1 text-[#ef4444] hover:bg-[#ef4444]/20 transition-colors"
                      title="Delete this environment"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {currentEnv ? (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[#94a3b8]">
                      Variables for <strong className="text-white">{currentEnv.name}</strong>.
                      Secret keys are saved with empty values; secret values remain in-memory only.
                    </span>
                    <button
                      onClick={handleAddEnvVar}
                      className="flex items-center gap-1 rounded bg-[#0284c7]/20 border border-[#0284c7]/40 px-2.5 py-1 text-[#38bdf8] hover:bg-[#0284c7]/30 transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Add Variable
                    </button>
                  </div>

                  <div className="rounded border border-[#1e293b] bg-[#0e1322] divide-y divide-[#1e293b]">
                    {currentEnv.variables.length === 0 ? (
                      <div className="p-4 text-center text-[#64748b]">No environment variables.</div>
                    ) : (
                      currentEnv.variables.map((v, i) => (
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
              ) : (
                <div className="p-4 text-center text-[#64748b]">No environments configured.</div>
              )}
            </div>
          )}

          {/* TAB 3: Workspace Variables */}
          {activeTab === 'workspace' && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#94a3b8]">
                  Global variables for <strong className="text-white">{workspace.meta.name}</strong>.
                  Secret keys are saved with empty values; secret values remain in-memory only.
                </span>
                <button
                  data-testid="env-add-workspace-var-btn"
                  onClick={handleAddWorkspaceVar}
                  className="flex items-center gap-1 rounded bg-[#0284c7]/20 border border-[#0284c7]/40 px-2.5 py-1 text-[#38bdf8] hover:bg-[#0284c7]/30 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add Variable
                </button>
              </div>

              <div className="rounded border border-[#1e293b] bg-[#0e1322] divide-y divide-[#1e293b]">
                {workspace.meta.variables.length === 0 ? (
                  <div className="p-4 text-center text-[#64748b]">No workspace variables configured.</div>
                ) : (
                  workspace.meta.variables.map((v, i) => (
                    <div key={i} className="flex items-center gap-2 p-2">
                      <input
                        type="text"
                        placeholder="Variable Key (e.g. globalToken)"
                        value={v.key}
                        onChange={(e) => handleUpdateWorkspaceVar(i, { key: e.target.value })}
                        className="w-1/3 rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 font-mono text-white focus:border-[#38bdf8] focus:outline-none"
                      />

                      <div className="relative flex-1">
                        <input
                          type={v.is_secret && !revealedKeys[`ws-${i}`] ? 'password' : 'text'}
                          placeholder="Value"
                          value={v.value}
                          onChange={(e) => handleUpdateWorkspaceVar(i, { value: e.target.value })}
                          className="w-full rounded border border-[#1e293b] bg-[#131b2e] px-2 py-1 pr-7 font-mono text-white focus:border-[#38bdf8] focus:outline-none"
                        />
                        {v.is_secret && (
                          <button
                            onClick={() => toggleReveal(`ws-${i}`)}
                            className="absolute right-2 top-1.5 text-[#64748b] hover:text-white"
                          >
                            {revealedKeys[`ws-${i}`] ? (
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
                            handleUpdateWorkspaceVar(i, { is_secret: e.target.checked })
                          }
                          className="accent-[#0ea5e9]"
                        />
                        <span>Secret</span>
                      </label>

                      <button
                        onClick={() => handleDeleteWorkspaceVar(i)}
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
            data-testid="env-done-btn"
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
