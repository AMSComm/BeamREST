import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWorkspaceStore } from '../stores/useWorkspaceStore'
import { tauriApi } from '../services/tauriApi'
import { WorkspaceFull } from '../types'

describe('Recent Requests Logic & Persistence', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(tauriApi, 'saveLocalState').mockResolvedValue(undefined)
    vi.spyOn(tauriApi, 'saveRecentWorkspace').mockResolvedValue([])
    vi.spyOn(tauriApi, 'saveLastWorkspacePath').mockResolvedValue(undefined)
    vi.spyOn(tauriApi, 'deleteRequest').mockResolvedValue(undefined)
    vi.spyOn(tauriApi, 'saveRequest').mockResolvedValue(undefined)
    vi.spyOn(tauriApi, 'renameProject').mockResolvedValue(undefined)
    vi.spyOn(tauriApi, 'deleteProject').mockResolvedValue(undefined)
    localStorage.clear()
  })

  const createSampleWorkspace = (): WorkspaceFull => ({
    path: '/mock/workspace',
    meta: {
      id: 'ws-1',
      name: 'Mock Workspace',
      variables: [],
    },
    environments: [],
    projects: [
      {
        id: 'proj-1',
        name: 'Billing Service',
        variables: [],
        requests: [
          {
            id: 'req-1',
            name: 'Get Invoices',
            method: 'GET',
            url: 'https://example.com/invoices',
            headers: [],
            params: [],
            body_type: 'none',
            body_content: '',
            extractors: [],
          },
          {
            id: 'req-2',
            name: 'Create Invoice',
            method: 'POST',
            url: 'https://example.com/invoices',
            headers: [],
            params: [],
            body_type: 'none',
            body_content: '',
            extractors: [],
          },
        ],
      },
      {
        id: 'proj-2',
        name: 'Auth Service',
        variables: [],
        requests: [
          {
            id: 'req-3',
            name: 'Login User',
            method: 'POST',
            url: 'https://example.com/login',
            headers: [],
            params: [],
            body_type: 'none',
            body_content: '',
            extractors: [],
          },
        ],
      },
    ],
  })

  it('adds request to recentRequests upon selectRequest and saves to storage', () => {
    const ws = createSampleWorkspace()
    useWorkspaceStore.setState({
      workspace: ws,
      recentRequests: [],
    })

    const { selectRequest } = useWorkspaceStore.getState()
    selectRequest('proj-1', 'req-1')

    const state = useWorkspaceStore.getState()
    expect(state.recentRequests.length).toBe(1)
    expect(state.recentRequests[0]).toMatchObject({
      project_id: 'proj-1',
      project_name: 'Billing Service',
      request_id: 'req-1',
      request_name: 'Get Invoices',
      method: 'GET',
    })
    expect(localStorage.getItem('beamrest:recent_requests:/mock/workspace')).toBeTruthy()
  })

  it('bumps previously selected request to the top without duplicates', () => {
    const ws = createSampleWorkspace()
    useWorkspaceStore.setState({
      workspace: ws,
      recentRequests: [],
    })

    const { selectRequest } = useWorkspaceStore.getState()
    selectRequest('proj-1', 'req-1')
    selectRequest('proj-1', 'req-2')
    selectRequest('proj-2', 'req-3')

    let state = useWorkspaceStore.getState()
    expect(state.recentRequests.map((r) => r.request_id)).toEqual(['req-3', 'req-2', 'req-1'])

    // Re-select req-1
    selectRequest('proj-1', 'req-1')
    state = useWorkspaceStore.getState()
    expect(state.recentRequests.map((r) => r.request_id)).toEqual(['req-1', 'req-3', 'req-2'])
  })

  it('clears recentRequests and updates storage', () => {
    const ws = createSampleWorkspace()
    useWorkspaceStore.setState({
      workspace: ws,
      recentRequests: [
        {
          project_id: 'proj-1',
          project_name: 'Billing Service',
          request_id: 'req-1',
          request_name: 'Get Invoices',
          method: 'GET',
          timestamp: Date.now(),
        },
      ],
    })

    const { clearRecentRequests } = useWorkspaceStore.getState()
    clearRecentRequests()

    const state = useWorkspaceStore.getState()
    expect(state.recentRequests.length).toBe(0)
    expect(localStorage.getItem('beamrest:recent_requests:/mock/workspace')).toBe('[]')
  })

  it('updates request_name in recentRequests when renameRequest is called', async () => {
    const ws = createSampleWorkspace()
    useWorkspaceStore.setState({
      workspace: ws,
      recentRequests: [
        {
          project_id: 'proj-1',
          project_name: 'Billing Service',
          request_id: 'req-1',
          request_name: 'Get Invoices',
          method: 'GET',
          timestamp: Date.now(),
        },
      ],
    })

    const { renameRequest } = useWorkspaceStore.getState()
    await renameRequest('proj-1', 'req-1', 'Fetch All Invoices')

    const state = useWorkspaceStore.getState()
    expect(state.recentRequests[0].request_name).toBe('Fetch All Invoices')
  })

  it('updates project_name in recentRequests when renameProject is called', async () => {
    const ws = createSampleWorkspace()
    useWorkspaceStore.setState({
      workspace: ws,
      recentRequests: [
        {
          project_id: 'proj-1',
          project_name: 'Billing Service',
          request_id: 'req-1',
          request_name: 'Get Invoices',
          method: 'GET',
          timestamp: Date.now(),
        },
      ],
    })

    const { renameProject } = useWorkspaceStore.getState()
    await renameProject('proj-1', 'Billing & Accounting')

    const state = useWorkspaceStore.getState()
    expect(state.recentRequests[0].project_name).toBe('Billing & Accounting')
  })

  it('removes deleted request from recentRequests', async () => {
    const ws = createSampleWorkspace()
    useWorkspaceStore.setState({
      workspace: ws,
      recentRequests: [
        {
          project_id: 'proj-1',
          project_name: 'Billing Service',
          request_id: 'req-1',
          request_name: 'Get Invoices',
          method: 'GET',
          timestamp: Date.now(),
        },
        {
          project_id: 'proj-2',
          project_name: 'Auth Service',
          request_id: 'req-3',
          request_name: 'Login User',
          method: 'POST',
          timestamp: Date.now(),
        },
      ],
    })

    const { deleteRequest } = useWorkspaceStore.getState()
    await deleteRequest('proj-1', 'req-1')

    const state = useWorkspaceStore.getState()
    expect(state.recentRequests.map((r) => r.request_id)).toEqual(['req-3'])
  })

  it('removes all requests belonging to a deleted project from recentRequests', async () => {
    const ws = createSampleWorkspace()
    useWorkspaceStore.setState({
      workspace: ws,
      recentRequests: [
        {
          project_id: 'proj-1',
          project_name: 'Billing Service',
          request_id: 'req-1',
          request_name: 'Get Invoices',
          method: 'GET',
          timestamp: Date.now(),
        },
        {
          project_id: 'proj-2',
          project_name: 'Auth Service',
          request_id: 'req-3',
          request_name: 'Login User',
          method: 'POST',
          timestamp: Date.now(),
        },
      ],
    })

    const { deleteProject } = useWorkspaceStore.getState()
    await deleteProject('proj-1')

    const state = useWorkspaceStore.getState()
    expect(state.recentRequests.map((r) => r.request_id)).toEqual(['req-3'])
  })

  it('restores recentRequests from local_state on loadWorkspace and filters out stale items', async () => {
    const ws = createSampleWorkspace()
    ws.local_state = {
      open_request_ids: [],
      collapsed_project_ids: [],
      recent_requests: [
        {
          project_id: 'proj-1',
          project_name: 'Old Name',
          request_id: 'req-1',
          request_name: 'Old Req Name',
          method: 'GET',
          timestamp: 1000,
        },
        {
          project_id: 'non-existent-proj',
          project_name: 'Ghost Proj',
          request_id: 'ghost-req',
          request_name: 'Ghost Req',
          method: 'DELETE',
          timestamp: 2000,
        },
      ],
    }

    vi.spyOn(tauriApi, 'openWorkspace').mockResolvedValue(ws)

    const { loadWorkspace } = useWorkspaceStore.getState()
    await loadWorkspace('/mock/workspace')

    const state = useWorkspaceStore.getState()
    expect(state.recentRequests.length).toBe(1)
    expect(state.recentRequests[0]).toMatchObject({
      project_id: 'proj-1',
      project_name: 'Billing Service', // refreshed from project
      request_id: 'req-1',
      request_name: 'Get Invoices', // refreshed from request
    })
  })
})
