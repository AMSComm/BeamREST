export interface KeyValuePair {
  key: string
  value: string
  enabled: boolean
  description?: string
}

export type AuthType = 'none' | 'inherit' | 'bearer' | 'basic' | 'apikey'

export interface AuthConfig {
  type: AuthType
  token?: string
  username?: string
  password?: string
  key?: string
  value?: string
  addTo?: 'header' | 'query'
}

export type ExtractorSource = 'bodyjson' | 'header' | 'regex'
export type VariableScope = 'project' | 'environment' | 'workspace'

export interface ExtractorRule {
  id: string
  name: string
  source: ExtractorSource
  expression: string
  target_variable: string
  target_scope: VariableScope
  is_secret: boolean
  enabled: boolean
}

export interface ExtractedVariable {
  key: string
  value: string
  scope: VariableScope
  is_secret: boolean
}

export interface BeamRequest {
  id: string
  name: string
  method: string
  url: string
  headers: KeyValuePair[]
  params: KeyValuePair[]
  body_type: 'none' | 'json' | 'urlencoded' | 'raw'
  body_content: string
  auth?: AuthConfig
  extractors: ExtractorRule[]
}

export interface BeamResponse {
  status: number
  status_text: string
  headers: KeyValuePair[]
  body: string
  size_bytes: number
  latency_ms: number
  timestamp: string
  extracted_variables: ExtractedVariable[]
}

export interface Variable {
  key: string
  value: string
  is_secret: boolean
  scope: VariableScope
}

export interface Environment {
  id: string
  name: string
  variables: Variable[]
}

export interface ProjectData {
  id: string
  name: string
  description?: string
  auth?: AuthConfig
  variables: Variable[]
  requests: BeamRequest[]
}

export interface WorkspaceMeta {
  id: string
  name: string
  active_environment_id?: string
  variables: Variable[]
}

export interface LocalState {
  active_tab_id?: string
  open_request_ids: string[]
  collapsed_project_ids: string[]
}

export interface WorkspaceFull {
  meta: WorkspaceMeta
  path: string
  environments: Environment[]
  projects: ProjectData[]
  local_state?: LocalState
}

export interface ProxyConfig {
  enabled: boolean
  url: string
}

export interface RecentWorkspace {
  path: string
  name: string
  last_opened: number
}

