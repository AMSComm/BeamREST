import { create } from 'zustand'
import { tauriApi } from '../services/tauriApi'
import {
  BeamRequest,
  BeamResponse,
  Environment,
  LocalState,
  ProjectData,
  ProxyConfig,
  RecentRequestItem,
  RecentWorkspace,
  WorkspaceFull,
  WorkspaceMeta,
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
  isUpdateModalOpen: boolean
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
  renameProject: (projectId: string, newName: string) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  createRequest: (projectId: string, name: string, method?: string) => Promise<void>
  cloneRequest: (projectId: string, requestId: string) => Promise<void>
  renameRequest: (projectId: string, requestId: string, newName: string) => Promise<void>
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
  setUpdateModalOpen: (open: boolean) => void
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

  // Recent Requests
  recentRequests: RecentRequestItem[]
  addRecentRequest: (projectId: string, req: BeamRequest) => void
  clearRecentRequests: () => void
  persistRecentRequests: (recents: RecentRequestItem[]) => Promise<void>
}

function restoreAndSanitizeRecents(
  ws: WorkspaceFull,
  fallbackRaw?: string | null
): RecentRequestItem[] {
  let list: RecentRequestItem[] = []
  if (ws.local_state?.recent_requests && Array.isArray(ws.local_state.recent_requests)) {
    list = ws.local_state.recent_requests
  } else if (fallbackRaw) {
    try {
      list = JSON.parse(fallbackRaw)
    } catch {
      list = []
    }
  }

  const sanitized: RecentRequestItem[] = []
  for (const item of list) {
    const proj = ws.projects.find((p) => p.id === item.project_id)
    if (!proj) continue
    const req = proj.requests.find((r) => r.id === item.request_id)
    if (!req) continue
    sanitized.push({
      ...item,
      project_name: proj.name,
      request_name: req.name,
      method: req.method,
    })
  }

  return sanitized.slice(0, 15)
}

export function getClonedRequestName(baseName: string, existingNames: string[]): string {
  const copyPattern = /^(.*) \(Copy(?: (\d+))?\)$/
  const match = baseName.match(copyPattern)
  const rootName = match ? match[1] : baseName

  let candidate = `${rootName} (Copy)`
  let counter = 2
  const lowerNames = new Set(existingNames.map((n) => n.toLowerCase()))
  while (lowerNames.has(candidate.toLowerCase())) {
    candidate = `${rootName} (Copy ${counter})`
    counter++
  }
  return candidate
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: null,
  recentWorkspaces: [],
  recentRequests: [],
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
  isUpdateModalOpen: false,
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

      const fallbackLocal =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem(`beamrest:recent_requests:${path}`) ||
            localStorage.getItem('beamrest:recent_requests')
          : null
      let recentReqs = restoreAndSanitizeRecents(ws, fallbackLocal)

      if (recentReqs.length === 0 && ws.projects.length > 0 && ws.projects[0].requests.length > 0) {
        const fp = ws.projects[0]
        const fr = fp.requests[0]
        recentReqs = [
          {
            project_id: fp.id,
            project_name: fp.name,
            request_id: fr.id,
            request_name: fr.name,
            method: fr.method,
            timestamp: Date.now(),
          },
        ]
      }

      set({
        workspace: ws,
        error: null,
        savedRequestSnapshots: snapshots,
        recentWorkspaces: recents,
        recentRequests: recentReqs,
      })
      get().persistRecentRequests(recentReqs)
      await tauriApi.saveLastWorkspacePath(path)

      // Auto-select top recent request if available, otherwise first request
      if (recentReqs.length > 0) {
        const top = recentReqs[0]
        const topProj = ws.projects.find((p) => p.id === top.project_id)
        const topReq = topProj?.requests.find((r) => r.id === top.request_id)
        if (topProj && topReq) {
          set({
            activeProjectId: topProj.id,
            activeRequestId: topReq.id,
            activeRequest: { ...topReq },
          })
        }
      } else if (ws.projects.length > 0 && ws.projects[0].requests.length > 0) {
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
      let recentReqs: RecentRequestItem[] = []
      if (ws.projects.length > 0 && ws.projects[0].requests.length > 0) {
        const fp = ws.projects[0]
        const fr = fp.requests[0]
        recentReqs = [
          {
            project_id: fp.id,
            project_name: fp.name,
            request_id: fr.id,
            request_name: fr.name,
            method: fr.method,
            timestamp: Date.now(),
          },
        ]
      }
      set({
        workspace: ws,
        error: null,
        savedRequestSnapshots: snapshots,
        recentWorkspaces: recents,
        recentRequests: recentReqs,
      })
      get().persistRecentRequests(recentReqs)
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

    get().addRecentRequest(projectId, req)
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

    if (patch.method || patch.name) {
      const updatedRecents = get().recentRequests.map((r) => {
        if (r.request_id !== activeRequestId) return r
        return {
          ...r,
          method: patch.method ?? r.method,
          request_name: patch.name ?? r.request_name,
        }
      })
      set({ recentRequests: updatedRecents })
      get().persistRecentRequests(updatedRecents)
    }

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

    const updatedRecents = get().recentRequests.filter((r) => r.project_id !== projectId)

    set({
      workspace: { ...workspace, projects: updatedProjects },
      recentRequests: updatedRecents,
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
    get().persistRecentRequests(updatedRecents)
  },

  renameProject: async (projectId: string, newName: string) => {
    const { workspace } = get()
    if (!workspace) return
    const trimmed = newName.trim()
    if (!trimmed) return

    const targetProj = workspace.projects.find((p) => p.id === projectId)
    if (!targetProj || targetProj.name === trimmed) return

    const exists = workspace.projects.some(
      (p) => p.id !== projectId && p.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (exists) {
      set({ error: `Project named "${trimmed}" already exists.` })
      return
    }

    const oldName = targetProj.name
    await tauriApi.renameProject(workspace.path, oldName, trimmed)

    const updatedProjects = workspace.projects.map((p) => {
      if (p.id !== projectId) return p
      return { ...p, name: trimmed }
    })

    const updatedRecents = get().recentRequests.map((r) =>
      r.project_id === projectId ? { ...r, project_name: trimmed } : r
    )

    set({
      workspace: { ...workspace, projects: updatedProjects },
      recentRequests: updatedRecents,
      error: null,
    })
    get().persistRecentRequests(updatedRecents)
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

    get().addRecentRequest(projectId, newReq)
  },

  cloneRequest: async (projectId: string, requestId: string) => {
    const { workspace, savedRequestSnapshots } = get()
    if (!workspace) return

    const proj = workspace.projects.find((p) => p.id === projectId)
    if (!proj) return

    const sourceReq = proj.requests.find((r) => r.id === requestId)
    if (!sourceReq) return

    const existingNames = proj.requests.map((r) => r.name)
    const newName = getClonedRequestName(sourceReq.name, existingNames)
    const newId = 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)

    const clonedReq: BeamRequest = {
      ...sourceReq,
      id: newId,
      name: newName,
      headers: sourceReq.headers.map((h) => ({ ...h })),
      params: sourceReq.params.map((p) => ({ ...p })),
      auth: sourceReq.auth ? { ...sourceReq.auth } : undefined,
      extractors: sourceReq.extractors.map((e, idx) => ({
        ...e,
        id: `ext-${Date.now()}-${idx}`,
      })),
    }

    await tauriApi.saveRequest(workspace.path, proj.name, clonedReq)

    const sourceIdx = proj.requests.findIndex((r) => r.id === requestId)
    const newRequests = [...proj.requests]
    if (sourceIdx >= 0) {
      newRequests.splice(sourceIdx + 1, 0, clonedReq)
    } else {
      newRequests.push(clonedReq)
    }

    const updatedProjects = workspace.projects.map((p) =>
      p.id === projectId ? { ...p, requests: newRequests } : p
    )

    set({
      workspace: { ...workspace, projects: updatedProjects },
      activeProjectId: projectId,
      activeRequestId: clonedReq.id,
      activeRequest: { ...clonedReq },
      response: null,
      curlText: null,
      savedRequestSnapshots: {
        ...savedRequestSnapshots,
        [clonedReq.id]: JSON.stringify(clonedReq),
      },
    })

    get().addRecentRequest(projectId, clonedReq)
  },

  renameRequest: async (projectId: string, requestId: string, newName: string) => {
    const { workspace, activeRequestId, activeRequest, savedRequestSnapshots } = get()
    if (!workspace) return
    const trimmed = newName.trim()
    if (!trimmed) return

    const proj = workspace.projects.find((p) => p.id === projectId)
    if (!proj) return

    const targetReq = proj.requests.find((r) => r.id === requestId)
    if (!targetReq || targetReq.name === trimmed) return

    const oldName = targetReq.name
    const updatedReq: BeamRequest =
      activeRequestId === requestId && activeRequest
        ? { ...activeRequest, name: trimmed }
        : { ...targetReq, name: trimmed }

    await tauriApi.deleteRequest(workspace.path, proj.name, oldName)
    await tauriApi.saveRequest(workspace.path, proj.name, updatedReq)

    const updatedProjects = workspace.projects.map((p) => {
      if (p.id !== projectId) return p
      return {
        ...p,
        requests: p.requests.map((r) => (r.id === requestId ? updatedReq : r)),
      }
    })

    const updatedRecents = get().recentRequests.map((r) =>
      r.request_id === requestId ? { ...r, request_name: trimmed } : r
    )

    const nextState: Partial<WorkspaceState> = {
      workspace: { ...workspace, projects: updatedProjects },
      recentRequests: updatedRecents,
      savedRequestSnapshots: {
        ...savedRequestSnapshots,
        [requestId]: JSON.stringify(updatedReq),
      },
    }

    if (activeRequestId === requestId) {
      nextState.activeRequest = { ...updatedReq }
    }

    set(nextState)
    get().persistRecentRequests(updatedRecents)
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

    const updatedRecents = get().recentRequests.filter((r) => r.request_id !== requestId)

    set({
      workspace: { ...workspace, projects: updatedProjects },
      recentRequests: updatedRecents,
      activeRequest: newActiveReq ? { ...newActiveReq } : null,
      activeRequestId: newActiveReq ? newActiveReq.id : null,
    })
    get().persistRecentRequests(updatedRecents)
  },

  setActiveEnvironment: (envId: string | null) => {
    const { workspace } = get()
    if (!workspace) return
    const updatedMeta: WorkspaceMeta = {
      ...workspace.meta,
      active_environment_id: envId || undefined,
    }
    set({
      workspace: {
        ...workspace,
        meta: updatedMeta,
      },
    })
    tauriApi.saveWorkspaceMeta(workspace.path, updatedMeta).catch((err) => {
      console.error('Failed to save active environment to workspace meta:', err)
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

    const updatedMeta: WorkspaceMeta = {
      ...workspace.meta,
      active_environment_id: activeEnvId,
    }

    set({
      workspace: {
        ...workspace,
        environments: updatedEnvs,
        meta: updatedMeta,
      },
    })

    if (workspace.meta.active_environment_id === envId) {
      tauriApi.saveWorkspaceMeta(workspace.path, updatedMeta).catch((err) => {
        console.error('Failed to save workspace meta after deleting active env:', err)
      })
    }
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
    if (get().isUpdateModalOpen) {
      set({ isUpdateModalOpen: false })
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
  setUpdateModalOpen: (open) => set({ isUpdateModalOpen: open }),
  openConfirmDelete: (target) => set({ confirmDeleteTarget: target }),
  closeConfirmDelete: () => set({ confirmDeleteTarget: null }),

  addRecentRequest: (projectId: string, req: BeamRequest) => {
    const { workspace, recentRequests } = get()
    if (!workspace) return

    const proj = workspace.projects.find((p) => p.id === projectId)
    const projName = proj ? proj.name : 'Unknown Project'

    const newItem: RecentRequestItem = {
      project_id: projectId,
      project_name: projName,
      request_id: req.id,
      request_name: req.name,
      method: req.method,
      timestamp: Date.now(),
    }

    const filtered = recentRequests.filter(
      (r) => !(r.project_id === projectId && r.request_id === req.id)
    )
    const updated = [newItem, ...filtered].slice(0, 15)

    set({ recentRequests: updated })
    get().persistRecentRequests(updated)
  },

  clearRecentRequests: () => {
    set({ recentRequests: [] })
    get().persistRecentRequests([])
  },

  persistRecentRequests: async (recents: RecentRequestItem[]) => {
    const { workspace } = get()
    if (!workspace) return

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`beamrest:recent_requests:${workspace.path}`, JSON.stringify(recents))
        localStorage.setItem('beamrest:recent_requests', JSON.stringify(recents))
      }
    } catch {
      // ignore
    }

    try {
      const currentState = workspace.local_state || {
        open_request_ids: [],
        collapsed_project_ids: [],
      }
      const updatedLocalState: LocalState = {
        ...currentState,
        recent_requests: recents,
      }
      await tauriApi.saveLocalState(workspace.path, updatedLocalState)
      set({
        workspace: {
          ...workspace,
          local_state: updatedLocalState,
        },
      })
    } catch {
      // ignore
    }
  },
}))

