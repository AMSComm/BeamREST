import { describe, it, expect } from 'vitest'
import { parseCurlCommand } from '../utils/curlParser'

describe('parseCurlCommand utility', () => {
  it('returns null for regular non-curl text', () => {
    expect(parseCurlCommand('https://api.example.com')).toBeNull()
    expect(parseCurlCommand('')).toBeNull()
  })

  it('parses standard GET request with headers and query params', () => {
    const cmd = `curl "https://api.example.com/v1/users?limit=25&active=true" -H "Accept: application/json" -H "X-Client: Web"`
    const parsed = parseCurlCommand(cmd)

    expect(parsed).not.toBeNull()
    expect(parsed?.method).toBe('GET')
    expect(parsed?.url).toBe('https://api.example.com/v1/users')
    expect(parsed?.params).toEqual([
      { key: 'limit', value: '25', enabled: true },
      { key: 'active', value: 'true', enabled: true },
    ])
    expect(parsed?.headers).toEqual([
      { key: 'Accept', value: 'application/json', enabled: true },
      { key: 'X-Client', value: 'Web', enabled: true },
    ])
  })

  it('parses multiline POST request with JSON body and Bearer token', () => {
    const cmd = `curl -X POST 'https://api.example.com/login' \\
      -H 'Content-Type: application/json' \\
      -H 'Authorization: Bearer secret_jwt_xyz' \\
      -d '{"username": "admin", "password": "123"}'`

    const parsed = parseCurlCommand(cmd)

    expect(parsed).not.toBeNull()
    expect(parsed?.method).toBe('POST')
    expect(parsed?.url).toBe('https://api.example.com/login')
    expect(parsed?.body_type).toBe('json')
    expect(parsed?.body_content).toBe('{"username": "admin", "password": "123"}')
    expect(parsed?.auth).toEqual({
      type: 'bearer',
      token: 'secret_jwt_xyz',
    })
  })

  it('parses basic authentication (-u user:pass)', () => {
    const cmd = `curl -u "myuser:mypassword" https://api.example.com/secure`
    const parsed = parseCurlCommand(cmd)

    expect(parsed).not.toBeNull()
    expect(parsed?.auth).toEqual({
      type: 'basic',
      username: 'myuser',
      password: 'mypassword',
    })
  })
})
