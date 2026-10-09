import { create } from 'zustand'
import { tauriApi } from '../services/tauriApi'
import {
  BeamRequest,
  BeamResponse,
  Environment,
  ProjectData,
  ProxyConfig,
  RecentWorkspace,
  WorkspaceFull,
} from '../types'

interface WorkspaceState {
  workspace: WorkspaceFull | null
  recentWorkspaces: RecentWorkspace[]
  activeProjectId: string | null
  activeRequestId: string | null
  activeRequest: BeamRequest | null
  response: BeamResponse | null
  isSending: boolean
  error: string | null
  curlText: string | null

  // Proxy
  proxy: ProxyConfig
  setProxy: (proxy: ProxyConfig) => void

  // Unsaved snapshots
  savedRequestSnapshots: Record<string, string>
  isRequestDirty: (requestId?: string) => boolean

  // Tab selections
  activeTab: 'params' | 'headers' | 'body' | 'auth' | 'extractors'
  responseTab: 'body' | 'headers' | 'curl' | 'extracted'

  // Modals
  isWorkspaceModalOpen: boolean
  isProxyModalOpen: boolean
  isEnvModalOpen: boolean
  isExportModalOpen: boolean
  isNewProjectModalOpen: boolean
  isNewRequestModalOpen: boolean
  targetProjectIdForNewRequest: string | null
  isShortcutsModalOpen: boolean
  confirmDeleteTarget: {
    type: 'request' | 'project' | 'environment'
    projectId?: string
    requestId?: string
    envId?: string
    name: string
  } | null

  // Actions
  setWorkspace: (ws: WorkspaceFull) => void
  loadWorkspace: (path: string) => Promise<void>
  initWorkspace: (path: string, name: string) => Promise<void>
  selectRequest: (projectId: string, requestId: string) => void
  updateActiveRequest: (patch: Partial<BeamRequest>) => void
  saveActiveRequest: () => Promise<void>
  sendRequest: () => Promise<void>
  createProject: (name: string) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  createRequest: (projectId: string, name: string, method?: string) => Promise<void>
  deleteRequest: (projectId: string, requestId: string) => Promise<void>
  setActiveEnvironment: (envId: string | null) => void
  saveEnvironment: (env: Environment) => Promise<void>
  deleteEnvironment: (envId: string) => Promise<void>
  saveProject: (project: ProjectData) => Promise<void>
  saveWorkspaceMeta: (meta: WorkspaceFull['meta']) => Promise<void>
  renameWorkspace: (newName: string) => Promise<void>
  getResolvedVariables: () => Record<string, string>
  getAllVariablesList: () => Array<{ key: string; value: string; scope: string; is_secret: boolean }>
  setActiveTab: (tab: WorkspaceState['activeTab']) => void
  setResponseTab: (tab: WorkspaceState['responseTab']) => void
  setWorkspaceModalOpen: (open: boolean) => void
  setProxyModalOpen: (open: boolean) => void
  setEnvModalOpen: (open: boolean) => void
  setExportModalOpen: (open: boolean) => void
  setNewProjectModalOpen: (open: boolean) => void
  openNewRequestModal: (projectId?: string) => void
  setNewRequestModalOpen: (open: boolean) => void
  setShortcutsModalOpen: (open: boolean) => void
  openConfirmDelete: (target: {
    type: 'request' | 'project' | 'environment'
    projectId?: string
    requestId?: string
    envId?: string
    name: string
  }) => void
  closeConfirmDelete: () => void
  copyCurl: () => Promise<string>
  updateCurlText: () => Promise<string>
  fetchRecentWorkspaces: () => Promise<void>
  removeRecentWorkspace: (path: string) => Promise<void>
  closeTopModal: () => boolean
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: null,
  recentWorkspaces: [],
  activeProjectId: null,
  activeRequestId: null,
  activeRequest: null,
  response: null,
  isSending: false,
  error: null,
  curlText: null,

  activeTab: 'params',
  responseTab: 'body',
  proxy: { enabled: false, url: '' },
  isProxyModalOpen: false,
  savedRequestSnapshots: {},
  isWorkspaceModalOpen: false,
  isEnvModalOpen: false,
  isExportModalOpen: false,
  isNewProjectModalOpen: false,
  isNewRequestModalOpen: false,
  targetProjectIdForNewRequest: null,
  isShortcutsModalOpen: false,
  confirmDeleteTarget: null,

  setWorkspace: (ws) => set({ workspace: ws }),
  setProxy: (proxy) => {
    set({ proxy })
    if (get().responseTab === 'curl') {
      get().updateCurlText()
    }
  },

  isRequestDirty: (requestId?: string) => {
    const { activeRequestId, activeRequest, savedRequestSnapshots, workspace } = get()
    const targetId = requestId || activeRequestId
    if (!targetId) return false
    const snapshot = savedRequestSnapshots[targetId]
    if (!snapshot) return false

    if (targetId === activeRequestId && activeRequest) {
      return JSON.stringify(activeRequest) !== snapshot
    }

    if (workspace) {
      for (const p of workspace.projects) {
        const req = p.requests.find((r) => r.id === targetId)
        if (req) {
          return JSON.stringify(req) !== snapshot
        }
      }
    }
    return false
  },

  getResolvedVariables: () => {
    const { workspace, activeProjectId } = get()
    if (!workspace) return {}

    const map: Record<string, string> = {}

    // 1. Workspace scope variables
    for (const v of workspace.meta.variables) {
      if (v.key) map[v.key] = v.value
    }

    // 2. Environment scope variables
    if (workspace.meta.active_environment_id) {
      const activeEnv = workspace.environments.find(
        (e) => e.id === workspace.meta.active_environment_id
      )
      if (activeEnv) {
        for (const v of activeEnv.variables) {
          if (v.key) map[v.key] = v.value
        }
      }
    }

    // 3. Project scope variables (highest precedence)
    if (activeProjectId) {
      const activeProj = workspace.projects.find((p) => p.id === activeProjectId)
      if (activeProj) {
        for (const v of activeProj.variables) {
          if (v.key) map[v.key] = v.value
        }
      }
    }

    return map
  },

  getAllVariablesList: () => {
    const { workspace, activeProjectId } = get()
    if (!workspace) return []

    const map = new Map<string, { key: string; value: string; scope: string; is_secret: boolean }>()

    // 1. Workspace scope variables
    for (const v of workspace.meta.variables) {
      if (v.key) {
        map.set(v.key, { key: v.key, value: v.value, scope: 'workspace', is_secret: v.is_secret })
      }
    }

    // 2. Environment scope variables
    if (workspace.meta.active_environment_id) {
      const activeEnv = workspace.environments.find(
        (e) => e.id === workspace.meta.active_environment_id
      )
      if (activeEnv) {
        for (const v of activeEnv.variables) {
          if (v.key) {
            map.set(v.key, { key: v.key, value: v.value, scope: 'environment', is_secret: v.is_secret })
          }
        }
      }
    }

    // 3. Project scope variables (highest precedence)
    if (activeProjectId) {
      const activeProj = workspace.projects.find((p) => p.id === activeProjectId)
      if (activeProj) {
        for (const v of activeProj.variables) {
          if (v.key) {
            map.set(v.key, { key: v.key, value: v.value, scope: 'project', is_secret: v.is_secret })
          }
        }
      }
    }

    return Array.from(map.values())
  },

  loadWorkspace: async (path: string) => {
    try {
      const ws = await tauriApi.openWorkspace(path)
      const snapshots: Record<string, string> = {}
      for (const p of ws.projects) {
        for (const r of p.requests) {
          snapshots[r.id] = JSON.stringify(r)
        }
      }
      const recents = await tauriApi.saveRecentWorkspace(path, ws.meta.name)
      set({
        workspace: ws,
        error: null,
        savedRequestSnapshots: snapshots,
        recentWorkspaces: recents,
      })
      await tauriApi.saveLastWorkspacePath(path)

      // Auto-select first request if available
      if (ws.projects.length > 0 && ws.projects[0].requests.length > 0) {
        const firstProj = ws.projects[0]
        const firstReq = firstProj.requests[0]
        set({
          activeProjectId: firstProj.id,
          activeRequestId: firstReq.id,
          activeRequest: { ...firstReq },
        })
      }
    } catch (err: any) {
      set({ error: String(err?.message || err) })
    }
  },

  initWorkspace: async (path: string, name: string) => {
    try {
      const ws = await tauriApi.createWorkspace(path, name)
      const snapshots: Record<string, string> = {}
      for (const p of ws.projects) {
        for (const r of p.requests) {
          snapshots[r.id] = JSON.stringify(r)
        }
      }
      const recents = await tauriApi.saveRecentWorkspace(path, name)
      set({
        workspace: ws,
        error: null,
        savedRequestSnapshots: snapshots,
        recentWorkspaces: recents,
      })
      await tauriApi.saveLastWorkspacePath(path)

      if (ws.projects.length > 0 && ws.projects[0].requests.length > 0) {
        set({
          activeProjectId: ws.projects[0].id,
          activeRequestId: ws.projects[0].requests[0].id,
          activeRequest: { ...ws.projects[0].requests[0] },
        })
      }
    } catch (err: any) {
      set({ error: String(err?.message || err) })
    }
  },

  selectRequest: (projectId: string, requestId: string) => {
    const { workspace } = get()
    if (!workspace) return

    const proj = workspace.projects.find((p) => p.id === projectId)
    if (!proj) return

    const req = proj.requests.find((r) => r.id === requestId)
    if (!req) return

    set({
      activeProjectId: projectId,
      activeRequestId: requestId,
      activeRequest: { ...req },
      response: null,
      curlText: null,
    })
  },

  updateActiveRequest: (patch) => {
    const { activeRequest, workspace, activeProjectId, activeRequestId, responseTab } = get()
    if (!activeRequest || !workspace || !activeProjectId || !activeRequestId) return

    const updated = { ...activeRequest, ...patch }

    // Update in workspace memory as well
    const updatedProjects = workspace.projects.map((proj) => {
      if (proj.id !== activeProjectId) return proj
      return {
        ...proj,
        requests: proj.requests.map((r) => (r.id === activeRequestId ? updated : r)),
      }
    })

    set({
      activeRequest: updated,
      workspace: { ...workspace, projects: updatedProjects },
    })

    if (responseTab === 'curl') {
      get().updateCurlText()
    }
  },

  saveActiveRequest: async () => {
    const { workspace, activeProjectId, activeRequest, savedRequestSnapshots } = get()
    if (!workspace || !activeProjectId || !activeRequest) return

    const proj = workspace.projects.find((p) => p.id === activeProjectId)
    if (!proj) return

    await tauriApi.saveRequest(workspace.path, proj.name, activeRequest)
    set({
      savedRequestSnapshots: {
        ...savedRequestSnapshots,
        [activeRequest.id]: JSON.stringify(activeRequest),
      },
    })
  },

  sendRequest: async () => {
    const { activeRequest, getResolvedVariables, workspace, activeProjectId, proxy } = get()
    if (!activeRequest || !workspace) return

    set({ isSending: true, error: null, responseTab: 'body' })
    const vars = getResolvedVariables()

    try {
      const resp = await tauriApi.executeHttpRequest(activeRequest, vars, proxy)
      set({ response: resp, isSending: false, responseTab: 'body' })

      // If extractors captured any variables, automatically update them into the project
      if (resp.extracted_variables && resp.extracted_variables.length > 0 && activeProjectId) {
        const proj = workspace.projects.find((p) => p.id === activeProjectId)
        if (proj) {
          const updatedVars = [...proj.variables]
          for (const ext of resp.extracted_variables) {
            const idx = updatedVars.findIndex((v) => v.key === ext.key)
            if (idx >= 0) {
              updatedVars[idx].value = ext.value
              updatedVars[idx].is_secret = ext.is_secret
            } else {
              updatedVars.push({
                key: ext.key,
                value: ext.value,
                is_secret: ext.is_secret,
                scope: ext.scope,
              })
            }
          }
          const updatedProj = { ...proj, variables: updatedVars }
          await get().saveProject(updatedProj)
        }
      }
    } catch (err: any) {
      set({
        isSending: false,
        error: String(err?.message || err),
        responseTab: 'body',
      })
    }
  },

  deleteProject: async (projectId: string) => {
    const { workspace, activeProjectId } = get()
    if (!workspace) return

    const proj = workspace.projects.find((p) => p.id === projectId)
    if (proj) {
      await tauriApi.deleteProject(workspace.path, proj.name)
    }

    const updatedProjects = workspace.projects.filter((p) => p.id !== projectId)
    const nextProj = updatedProjects.length > 0 ? updatedProjects[0] : null

    set({
      workspace: { ...workspace, projects: updatedProjects },
      activeProjectId: activeProjectId === projectId ? (nextProj ? nextProj.id : null) : activeProjectId,
      activeRequestId:
        activeProjectId === projectId
          ? nextProj && nextProj.requests.length > 0
            ? nextProj.requests[0].id
            : null
          : get().activeRequestId,
      activeRequest:
        activeProjectId === projectId
          ? nextProj && nextProj.requests.length > 0
            ? { ...nextProj.requests[0] }
            : null
          : get().activeRequest,
      response: null,
    })
  },

  createProject: async (name: string) => {
    const { workspace } = get()
    if (!workspace) return

    const newProj: ProjectData = {
      id: 'proj-' + Date.now(),
      name,
      description: '',
      variables: [],
      requests: [
        {
          id: 'req-' + Date.now(),
          name: 'New Request',
          method: 'GET',
          url: '{{baseUrl}}/api',
          headers: [],
          params: [],
          body_type: 'none',
          body_content: '',
          extractors: [],
        },
      ],
    }

    await tauriApi.saveProject(workspace.path, newProj)
    const updatedProjects = [...workspace.projects, newProj]
    set({
      workspace: { ...workspace, projects: updatedProjects },
      activeProjectId: newProj.id,
      activeRequestId: newProj.requests[0].id,
      activeRequest: { ...newProj.requests[0] },
    })
  },

  createRequest: async (projectId: string, name: string, method = 'GET') => {
    const { workspace } = get()
    if (!workspace) return

    const proj = workspace.projects.find((p) => p.id === projectId)
    if (!proj) return

    const newReq: BeamRequest = {
      id: 'req-' + Date.now(),
      name,
      method,
      url: '{{baseUrl}}/api',
      headers: [],
      params: [],
      body_type: 'none',
      body_content: '',
      extractors: [],
    }

    await tauriApi.saveRequest(workspace.path, proj.name, newReq)

    const updatedProjects = workspace.projects.map((p) => {
      if (p.id !== projectId) return p
      return { ...p, requests: [...p.requests, newReq] }
    })

    set({
      workspace: { ...workspace, projects: updatedProjects },
      activeProjectId: projectId,
      activeRequestId: newReq.id,
      activeRequest: { ...newReq },
      savedRequestSnapshots: {
        ...get().savedRequestSnapshots,
        [newReq.id]: JSON.stringify(newReq),
      },
    })
  },

  deleteRequest: async (projectId: string, requestId: string) => {
    const { workspace, activeRequestId } = get()
    if (!workspace) return

    const proj = workspace.projects.find((p) => p.id === projectId)
    if (!proj) return

    const reqToDelete = proj.requests.find((r) => r.id === requestId)
    if (reqToDelete) {
      await tauriApi.deleteRequest(workspace.path, proj.name, reqToDelete.name)
    }

    const updatedRequests = proj.requests.filter((r) => r.id !== requestId)
    const updatedProjects = workspace.projects.map((p) =>
      p.id === projectId ? { ...p, requests: updatedRequests } : p
    )

    const newActiveReq =
      activeRequestId === requestId
        ? updatedRequests.length > 0
          ? updatedRequests[0]
          : null
        : get().activeRequest

    set({
      workspace: { ...workspace, projects: updatedProjects },
      activeRequest: newActiveReq ? { ...newActiveReq } : null,
      activeRequestId: newActiveReq ? newActiveReq.id : null,
    })
  },

  setActiveEnvironment: (envId: string | null) => {
    const { workspace } = get()
    if (!workspace) return
    set({
      workspace: {
        ...workspace,
        meta: { ...workspace.meta, active_environment_id: envId || undefined },
      },
    })
  },

  saveEnvironment: async (env: Environment) => {
    const { workspace } = get()
    if (!workspace) return

    await tauriApi.saveEnvironment(workspace.path, env)

    const exists = workspace.environments.some((e) => e.id === env.id)
    const updatedEnvs = exists
      ? workspace.environments.map((e) => (e.id === env.id ? env : e))
      : [...workspace.environments, env]

    set({
      workspace: { ...workspace, environments: updatedEnvs },
    })
  },

  deleteEnvironment: async (envId: string) => {
    const { workspace } = get()
    if (!workspace) return

    const env = workspace.environments.find((e) => e.id === envId)
    if (env) {
      await tauriApi.deleteEnvironment(workspace.path, env.name)
    }

    const updatedEnvs = workspace.environments.filter((e) => e.id !== envId)
    const activeEnvId =
      workspace.meta.active_environment_id === envId
        ? undefined
        : workspace.meta.active_environment_id

    set({
      workspace: {
        ...workspace,
        environments: updatedEnvs,
        meta: { ...workspace.meta, active_environment_id: activeEnvId },
      },
    })
  },

  saveProject: async (project: ProjectData) => {
    const { workspace } = get()
    if (!workspace) return

    await tauriApi.saveProject(workspace.path, project)

    const updatedProjects = workspace.projects.map((p) =>
      p.id === project.id ? project : p
    )
    set({
      workspace: { ...workspace, projects: updatedProjects },
    })
  },

  saveWorkspaceMeta: async (meta: WorkspaceFull['meta']) => {
    const { workspace } = get()
    if (!workspace) return

    await tauriApi.saveWorkspaceMeta(workspace.path, meta)
    set({
      workspace: { ...workspace, meta },
    })
  },

  renameWorkspace: async (newName: string) => {
    const { workspace } = get()
    if (!workspace || !newName.trim()) return

    const updatedMeta = { ...workspace.meta, name: newName.trim() }
    await tauriApi.saveWorkspaceMeta(workspace.path, updatedMeta)
    const recents = await tauriApi.saveRecentWorkspace(workspace.path, newName.trim())
    set({
      workspace: { ...workspace, meta: updatedMeta },
      recentWorkspaces: recents,
    })
  },

  fetchRecentWorkspaces: async () => {
    const recents = await tauriApi.getRecentWorkspaces()
    set({ recentWorkspaces: recents })
  },

  removeRecentWorkspace: async (path: string) => {
    const recents = await tauriApi.removeRecentWorkspace(path)
    set({ recentWorkspaces: recents })
  },

  closeTopModal: () => {
    const {
      confirmDeleteTarget,
      isProxyModalOpen,
      isEnvModalOpen,
      isExportModalOpen,
      isWorkspaceModalOpen,
      isNewRequestModalOpen,
      isNewProjectModalOpen,
      isShortcutsModalOpen,
    } = get()

    if (confirmDeleteTarget) {
      set({ confirmDeleteTarget: null })
      return true
    }
    if (isProxyModalOpen) {
      set({ isProxyModalOpen: false })
      return true
    }
    if (isEnvModalOpen) {
      set({ isEnvModalOpen: false })
      return true
    }
    if (isExportModalOpen) {
      set({ isExportModalOpen: false })
      return true
    }
    if (isWorkspaceModalOpen) {
      set({ isWorkspaceModalOpen: false })
      return true
    }
    if (isNewRequestModalOpen) {
      set({ isNewRequestModalOpen: false })
      return true
    }
    if (isNewProjectModalOpen) {
      set({ isNewProjectModalOpen: false })
      return true
    }
    if (isShortcutsModalOpen) {
      set({ isShortcutsModalOpen: false })
      return true
    }
    return false
  },

  updateCurlText: async () => {
    const { activeRequest, getResolvedVariables, proxy } = get()
    if (!activeRequest) {
      set({ curlText: '' })
      return ''
    }
    const vars = getResolvedVariables()
    const curl = await tauriApi.generateCurl(activeRequest, vars, proxy)
    set({ curlText: curl })
    return curl
  },

  copyCurl: async () => {
    const curl = await get().updateCurlText()
    try {
      await navigator.clipboard.writeText(curl)
    } catch {
      // ignore
    }
    set({ responseTab: 'curl' })
    return curl
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setResponseTab: (tab) => {
    set({ responseTab: tab })
    if (tab === 'curl') {
      get().updateCurlText()
    }
  },
  setWorkspaceModalOpen: (open) => set({ isWorkspaceModalOpen: open }),
  setProxyModalOpen: (open) => set({ isProxyModalOpen: open }),
  setEnvModalOpen: (open) => set({ isEnvModalOpen: open }),
  setExportModalOpen: (open) => set({ isExportModalOpen: open }),
  setNewProjectModalOpen: (open) => set({ isNewProjectModalOpen: open }),
  openNewRequestModal: (projectId) => {
    const { activeProjectId, workspace } = get()
    const target = projectId || activeProjectId || workspace?.projects[0]?.id || null
    set({
      targetProjectIdForNewRequest: target,
      isNewRequestModalOpen: true,
    })
  },
  setNewRequestModalOpen: (open) => set({ isNewRequestModalOpen: open }),
  setShortcutsModalOpen: (open) => set({ isShortcutsModalOpen: open }),
  openConfirmDelete: (target) => set({ confirmDeleteTarget: target }),
  closeConfirmDelete: () => set({ confirmDeleteTarget: null }),
}))

