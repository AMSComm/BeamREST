import { invoke } from '@tauri-apps/api/core'
import {
  BeamRequest,
  BeamResponse,
  Environment,
  LocalState,
  ProjectData,
  ProxyConfig,
  WorkspaceFull,
  WorkspaceMeta,
} from '../types'

// Check if running inside native Tauri runtime
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export const tauriApi = {
  async executeHttpRequest(
    request: BeamRequest,
    variables: Record<string, string>,
    proxy?: ProxyConfig
  ): Promise<BeamResponse> {
    if (isTauri()) {
      return await invoke<BeamResponse>('execute_http_request', {
        request,
        variables,
        proxy,
      })
    }

    // Browser mock fallback
    const start = performance.now()
    try {
      let url = request.url
      for (const [k, v] of Object.entries(variables)) {
        url = url.replaceAll(`{{${k}}}`, v)
      }
      if (!url.startsWith('http')) url = 'https://' + url

      const res = await fetch(url, {
        method: request.method,
      })
      const text = await res.text()
      const latency = Math.round(performance.now() - start)

      return {
        status: res.status,
        status_text: res.statusText || 'OK',
        headers: Array.from(res.headers.entries()).map(([k, v]) => ({
          key: k,
          value: v,
          enabled: true,
        })),
        body: text,
        size_bytes: new Blob([text]).size,
        latency_ms: latency,
        timestamp: new Date().toISOString(),
        extracted_variables: [],
      }
    } catch (err: any) {
      return {
        status: 0,
        status_text: 'Error',
        headers: [],
        body: String(err?.message || err),
        size_bytes: 0,
        latency_ms: Math.round(performance.now() - start),
        timestamp: new Date().toISOString(),
        extracted_variables: [],
      }
    }
  },

  async openWorkspace(path: string): Promise<WorkspaceFull> {
    if (isTauri()) {
      return await invoke<WorkspaceFull>('open_workspace', { path })
    }
    // Browser mock
    return createMockWorkspace(path)
  },

  async createWorkspace(path: string, name: string): Promise<WorkspaceFull> {
    if (isTauri()) {
      return await invoke<WorkspaceFull>('create_workspace', { path, name })
    }
    return createMockWorkspace(path, name)
  },

  async saveProject(workspacePath: string, project: ProjectData): Promise<void> {
    if (isTauri()) {
      return await invoke<void>('save_project_cmd', {
        workspacePath,
        project,
      })
    }
  },

  async deleteProject(workspacePath: string, projectName: string): Promise<void> {
    if (isTauri()) {
      return await invoke<void>('delete_project_cmd', {
        workspacePath,
        projectName,
      })
    }
  },

  async saveRequest(
    workspacePath: string,
    projectName: string,
    request: BeamRequest
  ): Promise<void> {
    if (isTauri()) {
      return await invoke<void>('save_request_cmd', {
        workspacePath,
        projectName,
        request,
      })
    }
  },

  async deleteRequest(
    workspacePath: string,
    projectName: string,
    requestName: string
  ): Promise<void> {
    if (isTauri()) {
      return await invoke<void>('delete_request_cmd', {
        workspacePath,
        projectName,
        requestName,
      })
    }
  },

  async saveEnvironment(workspacePath: string, env: Environment): Promise<void> {
    if (isTauri()) {
      return await invoke<void>('save_environment_cmd', {
        workspacePath,
        env,
      })
    }
  },

  async deleteEnvironment(workspacePath: string, envName: string): Promise<void> {
    if (isTauri()) {
      return await invoke<void>('delete_environment_cmd', {
        workspacePath,
        envName,
      })
    }
  },

  async saveWorkspaceMeta(workspacePath: string, meta: WorkspaceMeta): Promise<void> {
    if (isTauri()) {
      return await invoke<void>('save_workspace_meta_cmd', {
        workspacePath,
        meta,
      })
    }
  },

  async saveLocalState(workspacePath: string, state: LocalState): Promise<void> {
    if (isTauri()) {
      return await invoke<void>('save_local_state_cmd', {
        workspacePath,
        state,
      })
    }
  },

  async generateCurl(
    request: BeamRequest,
    variables: Record<string, string>,
    proxy?: ProxyConfig
  ): Promise<string> {
    if (isTauri()) {
      return await invoke<string>('generate_curl_cmd', {
        request,
        variables,
        proxy,
      })
    }
    const proxyFlag = proxy?.enabled && proxy.url ? `-x "${proxy.url.trim()}" ` : ''
    return `curl ${proxyFlag}-X ${request.method} "${request.url}"`
  },

  async exportPostman(
    scope: 'project' | 'workspace',
    payload: any,
    includeSecrets: boolean
  ): Promise<string> {
    if (isTauri()) {
      return await invoke<string>('export_postman_cmd', {
        scope,
        payload,
        includeSecrets,
      })
    }
    return JSON.stringify(
      {
        info: {
          name: payload?.name || payload?.meta?.name || 'Exported Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: (payload?.requests || []).map((r: any) => ({
          name: r.name,
          request: {
            method: r.method,
            url: { raw: r.url },
          },
        })),
        variable: (payload?.variables || []).map((v: any) => ({
          key: v.key,
          value: v.is_secret && !includeSecrets ? '' : v.value,
        })),
      },
      null,
      2
    )
  },


  async getLastWorkspacePath(): Promise<string | null> {
    if (isTauri()) {
      return await invoke<string | null>('get_last_workspace_path')
    }
    return null
  },

  async saveLastWorkspacePath(path: string): Promise<void> {
    if (isTauri()) {
      return await invoke<void>('save_last_workspace_path', { path })
    }
  },
}

function createMockWorkspace(path: string, name = 'Default Workspace'): WorkspaceFull {
  return {
    meta: {
      id: 'mock-ws-1',
      name,
      variables: [
        {
          key: 'globalHost',
          value: 'https://httpbin.org',
          is_secret: false,
          scope: 'workspace',
        },
      ],
    },
    path,
    environments: [
      {
        id: 'env-dev',
        name: 'Development',
        variables: [
          {
            key: 'env',
            value: 'dev',
            is_secret: false,
            scope: 'environment',
          },
          {
            key: 'apiKey',
            value: 'secret_dev_key_xyz',
            is_secret: true,
            scope: 'environment',
          },
        ],
      },
    ],
    projects: [
      {
        id: 'p1',
        name: 'HTTPBin Testing',
        description: 'Comprehensive HTTP test collection',
        variables: [
          {
            key: 'baseUrl',
            value: 'https://httpbin.org',
            is_secret: false,
            scope: 'project',
          },
        ],
        requests: [
          {
            id: 'r1',
            name: 'Get User Agent',
            method: 'GET',
            url: '{{baseUrl}}/user-agent',
            headers: [
              {
                key: 'Accept',
                value: 'application/json',
                enabled: true,
              },
            ],
            params: [],
            body_type: 'none',
            body_content: '',
            extractors: [],
          },
          {
            id: 'r2',
            name: 'Create Echo Session',
            method: 'POST',
            url: '{{baseUrl}}/post',
            headers: [
              {
                key: 'Content-Type',
                value: 'application/json',
                enabled: true,
              },
            ],
            params: [],
            body_type: 'json',
            body_content: '{\n  "client": "BeamREST",\n  "status": "ready"\n}',
            extractors: [
              {
                id: 'e1',
                name: 'Auto Capture Origin',
                source: 'bodyjson',
                expression: 'origin',
                target_variable: 'client_origin',
                target_scope: 'project',
                is_secret: false,
                enabled: true,
              },
            ],
          },
        ],
      },
    ],
  }
}
