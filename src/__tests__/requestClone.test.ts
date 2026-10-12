import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWorkspaceStore, getClonedRequestName } from '../stores/useWorkspaceStore'
import { tauriApi } from '../services/tauriApi'
import { WorkspaceFull } from '../types'

describe('Request Cloning Logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(tauriApi, 'saveRequest').mockResolvedValue(undefined)
    vi.spyOn(tauriApi, 'saveLocalState').mockResolvedValue(undefined)
    localStorage.clear()
  })

  describe('getClonedRequestName helper', () => {
    it('appends (Copy) to a standard request name', () => {
      const name = getClonedRequestName('Get User Profile', ['Get User Profile'])
      expect(name).toBe('Get User Profile (Copy)')
    })

    it('increments copy counter if (Copy) already exists', () => {
      const name = getClonedRequestName('Get User Profile', [
        'Get User Profile',
        'Get User Profile (Copy)',
      ])
      expect(name).toBe('Get User Profile (Copy 2)')
    })

    it('increments copy counter when cloning an existing copy', () => {
      const name = getClonedRequestName('Get User Profile (Copy)', [
        'Get User Profile',
        'Get User Profile (Copy)',
      ])
      expect(name).toBe('Get User Profile (Copy 2)')
    })

    it('increments from a numbered copy', () => {
      const name = getClonedRequestName('Get User Profile (Copy 2)', [
        'Get User Profile',
        'Get User Profile (Copy)',
        'Get User Profile (Copy 2)',
      ])
      expect(name).toBe('Get User Profile (Copy 3)')
    })

    it('handles case-insensitive duplicate collisions', () => {
      const name = getClonedRequestName('Get Invoices', [
        'Get Invoices',
        'get invoices (copy)',
      ])
      expect(name).toBe('Get Invoices (Copy 2)')
    })
  })

  describe('cloneRequest in useWorkspaceStore', () => {
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
              headers: [{ key: 'X-Auth', value: 'secret', enabled: true }],
              params: [{ key: 'limit', value: '10', enabled: true }],
              body_type: 'none',
              body_content: '',
              auth: { type: 'bearer', token: 'jwt123' },
              extractors: [
                {
                  id: 'ext-old',
                  name: 'Capture Token',
                  source: 'bodyjson',
                  expression: 'token',
                  target_variable: 'auth_token',
                  target_scope: 'project',
                  is_secret: true,
                  enabled: true,
                },
              ],
            },
            {
              id: 'req-2',
              name: 'Create Invoice',
              method: 'POST',
              url: 'https://example.com/invoices',
              headers: [],
              params: [],
              body_type: 'json',
              body_content: '{}',
              extractors: [],
            },
          ],
        },
      ],
    })

    it('creates a deep cloned request, saves to disk, and sets as active request', async () => {
      const ws = createSampleWorkspace()
      useWorkspaceStore.setState({
        workspace: ws,
        activeProjectId: 'proj-1',
        activeRequestId: 'req-1',
        activeRequest: { ...ws.projects[0].requests[0] },
        recentRequests: [],
        savedRequestSnapshots: {
          'req-1': JSON.stringify(ws.projects[0].requests[0]),
        },
      })

      const { cloneRequest } = useWorkspaceStore.getState()
      await cloneRequest('proj-1', 'req-1')

      const state = useWorkspaceStore.getState()
      const proj = state.workspace?.projects[0]
      expect(proj?.requests.length).toBe(3)

      // Cloned request should be placed right after req-1
      const cloned = proj?.requests[1]
      expect(cloned?.name).toBe('Get Invoices (Copy)')
      expect(cloned?.id).not.toBe('req-1')
      expect(cloned?.method).toBe('GET')
      expect(cloned?.url).toBe('https://example.com/invoices')
      expect(cloned?.headers).toEqual([{ key: 'X-Auth', value: 'secret', enabled: true }])
      expect(cloned?.params).toEqual([{ key: 'limit', value: '10', enabled: true }])
      expect(cloned?.auth).toEqual({ type: 'bearer', token: 'jwt123' })
      expect(cloned?.extractors.length).toBe(1)
      expect(cloned?.extractors[0].id).not.toBe('ext-old')
      expect(cloned?.extractors[0].target_variable).toBe('auth_token')

      // Should be active in editor
      expect(state.activeRequestId).toBe(cloned?.id)
      expect(state.activeRequest?.name).toBe('Get Invoices (Copy)')

      // Should be persisted via tauriApi
      expect(tauriApi.saveRequest).toHaveBeenCalledWith(
        '/mock/workspace',
        'Billing Service',
        expect.objectContaining({
          name: 'Get Invoices (Copy)',
          id: cloned?.id,
        })
      )

      // Should be added to recent requests
      expect(state.recentRequests.length).toBe(1)
      expect(state.recentRequests[0].request_name).toBe('Get Invoices (Copy)')
    })

    it('ignores non-existent project or request', async () => {
      const ws = createSampleWorkspace()
      useWorkspaceStore.setState({
        workspace: ws,
        activeProjectId: 'proj-1',
        activeRequestId: 'req-1',
      })

      const { cloneRequest } = useWorkspaceStore.getState()
      await cloneRequest('proj-1', 'non-existent-req')
      await cloneRequest('non-existent-proj', 'req-1')

      expect(tauriApi.saveRequest).not.toHaveBeenCalled()
      expect(useWorkspaceStore.getState().workspace?.projects[0].requests.length).toBe(2)
    })
  })
})
