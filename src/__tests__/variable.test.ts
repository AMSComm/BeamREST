import { describe, it, expect } from 'vitest'

describe('Variable Interpolation & Scoping Logic', () => {
  const interpolate = (template: string, vars: Record<string, string>): string => {
    let result = template
    for (const [key, val] of Object.entries(vars)) {
      result = result.replaceAll(`{{${key}}}`, val)
    }
    return result
  }

  it('interpolates multiple variables correctly in URL and headers', () => {
    const vars = {
      baseUrl: 'https://api.domain.com',
      version: 'v2',
      userId: 'user_456',
    }

    const template = '{{baseUrl}}/{{version}}/users/{{userId}}'
    expect(interpolate(template, vars)).toBe('https://api.domain.com/v2/users/user_456')
  })

  it('prioritizes project variables over environment and workspace', () => {
    const workspaceVars = { token: 'ws_token', host: 'ws_host' }
    const envVars = { token: 'env_token' }
    const projectVars = { token: 'proj_token' }

    // Merge in order: workspace -> env -> project
    const resolved = { ...workspaceVars, ...envVars, ...projectVars }

    expect(resolved.token).toBe('proj_token')
    expect(resolved.host).toBe('ws_host')
  })

  it('masks secret variables when requested', () => {
    const variables = [
      { key: 'apiKey', value: 'super-secret-key-123', is_secret: true },
      { key: 'publicHost', value: 'https://api.com', is_secret: false },
    ]

    const sanitized = variables.map((v) => ({
      key: v.key,
      value: v.is_secret ? '' : v.value,
      is_secret: v.is_secret,
    }))

    expect(sanitized[0].value).toBe('')
    expect(sanitized[1].value).toBe('https://api.com')
  })
})
