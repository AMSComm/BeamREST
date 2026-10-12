import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWorkspaceStore } from '../stores/useWorkspaceStore'
import { tauriApi } from '../services/tauriApi'
import { WorkspaceFull } from '../types'

describe('Project Renaming Logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(tauriApi, 'renameProject').mockResolvedValue(undefined)
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
        name: 'Project Alpha',
        variables: [],
        requests: [],
      },
      {
        id: 'proj-2',
        name: 'Project Beta',
        variables: [],
        requests: [],
      },
    ],
  })

  it('renames a project, updates memory state, and calls tauriApi.renameProject', async () => {
    const ws = createSampleWorkspace()
    useWorkspaceStore.setState({
      workspace: ws,
      error: null,
    })

    const { renameProject } = useWorkspaceStore.getState()
    await renameProject('proj-1', 'Renamed Alpha')

    const state = useWorkspaceStore.getState()
    const proj1 = state.workspace?.projects.find((p) => p.id === 'proj-1')

    expect(proj1?.name).toBe('Renamed Alpha')
    expect(state.error).toBeNull()
    expect(tauriApi.renameProject).toHaveBeenCalledWith(
      '/mock/workspace',
      'Project Alpha',
      'Renamed Alpha'
    )
  })

  it('rejects duplicate project names case-insensitively and sets error', async () => {
    const ws = createSampleWorkspace()
    useWorkspaceStore.setState({
      workspace: ws,
      error: null,
    })

    const { renameProject } = useWorkspaceStore.getState()
    await renameProject('proj-1', 'project beta')

    const state = useWorkspaceStore.getState()
    const proj1 = state.workspace?.projects.find((p) => p.id === 'proj-1')

    expect(proj1?.name).toBe('Project Alpha')
    expect(state.error).toBe('Project named "project beta" already exists.')
    expect(tauriApi.renameProject).not.toHaveBeenCalled()
  })

  it('ignores empty or unchanged names without calling tauriApi', async () => {
    const ws = createSampleWorkspace()
    useWorkspaceStore.setState({
      workspace: ws,
      error: null,
    })

    const { renameProject } = useWorkspaceStore.getState()
    await renameProject('proj-1', '   ')
    await renameProject('proj-1', 'Project Alpha')

    expect(tauriApi.renameProject).not.toHaveBeenCalled()
    expect(useWorkspaceStore.getState().workspace?.projects[0].name).toBe('Project Alpha')
  })
})
