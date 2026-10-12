import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWorkspaceStore } from '../stores/useWorkspaceStore'
import { tauriApi } from '../services/tauriApi'
import { WorkspaceFull } from '../types'

describe('Request Renaming Logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(tauriApi, 'deleteRequest').mockResolvedValue(undefined)
    vi.spyOn(tauriApi, 'saveRequest').mockResolvedValue(undefined)
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
        name: 'My Project',
        variables: [],
        requests: [
          {
            id: 'req-1',
            name: 'Original Request Name',
            method: 'GET',
            url: 'https://example.com/api',
            headers: [],
            params: [],
            body_type: 'none',
            body_content: '',
            extractors: [],
          },
          {
            id: 'req-2',
            name: 'Second Request',
            method: 'POST',
            url: 'https://example.com/post',
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

  it('renames a request, updates memory state, and triggers disk delete + save', async () => {
    const ws = createSampleWorkspace()
    useWorkspaceStore.setState({
      workspace: ws,
      activeProjectId: 'proj-1',
      activeRequestId: 'req-1',
      activeRequest: { ...ws.projects[0].requests[0] },
      savedRequestSnapshots: {
        'req-1': JSON.stringify(ws.projects[0].requests[0]),
      },
    })

    const { renameRequest } = useWorkspaceStore.getState()
    await renameRequest('proj-1', 'req-1', 'Renamed User Profile')

    const state = useWorkspaceStore.getState()
    const updatedReq = state.workspace?.projects[0].requests.find((r) => r.id === 'req-1')

    expect(updatedReq?.name).toBe('Renamed User Profile')
    expect(state.activeRequest?.name).toBe('Renamed User Profile')
    expect(tauriApi.deleteRequest).toHaveBeenCalledWith(
      '/mock/workspace',
      'My Project',
      'Original Request Name'
    )
    expect(tauriApi.saveRequest).toHaveBeenCalledWith(
      '/mock/workspace',
      'My Project',
      expect.objectContaining({
        id: 'req-1',
        name: 'Renamed User Profile',
      })
    )
  })

  it('ignores empty, whitespace-only or unchanged names', async () => {
    const ws = createSampleWorkspace()
    useWorkspaceStore.setState({
      workspace: ws,
      activeProjectId: 'proj-1',
      activeRequestId: 'req-1',
      activeRequest: { ...ws.projects[0].requests[0] },
    })

    const { renameRequest } = useWorkspaceStore.getState()
    await renameRequest('proj-1', 'req-1', '   ')
    await renameRequest('proj-1', 'req-1', 'Original Request Name')

    expect(tauriApi.deleteRequest).not.toHaveBeenCalled()
    expect(tauriApi.saveRequest).not.toHaveBeenCalled()
    expect(useWorkspaceStore.getState().activeRequest?.name).toBe('Original Request Name')
  })

  it('renames a non-active request without mutating currently active request', async () => {
    const ws = createSampleWorkspace()
    useWorkspaceStore.setState({
      workspace: ws,
      activeProjectId: 'proj-1',
      activeRequestId: 'req-1',
      activeRequest: { ...ws.projects[0].requests[0] },
    })

    const { renameRequest } = useWorkspaceStore.getState()
    await renameRequest('proj-1', 'req-2', 'Renamed Second Post')

    const state = useWorkspaceStore.getState()
    const req2 = state.workspace?.projects[0].requests.find((r) => r.id === 'req-2')
    expect(req2?.name).toBe('Renamed Second Post')
    expect(state.activeRequest?.name).toBe('Original Request Name')
    expect(tauriApi.deleteRequest).toHaveBeenCalledWith(
      '/mock/workspace',
      'My Project',
      'Second Request'
    )
  })
})
