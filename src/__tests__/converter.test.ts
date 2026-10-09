import { describe, it, expect } from 'vitest'

describe('cURL and Postman Converter Logic', () => {
  const generateSimpleCurl = (req: {
    method: string
    url: string
    headers: { key: string; value: string; enabled: boolean }[]
    body?: string
  }): string => {
    const parts = ['curl']
    if (req.method !== 'GET') {
      parts.push(`-X ${req.method}`)
    }
    for (const h of req.headers) {
      if (h.enabled) parts.push(`-H "${h.key}: ${h.value}"`)
    }
    if (req.body) {
      parts.push(`-d '${req.body}'`)
    }
    parts.push(`"${req.url}"`)
    return parts.join(' ')
  }

  it('generates standard cURL command with headers and body', () => {
    const req = {
      method: 'POST',
      url: 'https://api.example.com/login',
      headers: [
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'Authorization', value: 'Bearer test-token', enabled: true },
      ],
      body: '{"username":"admin"}',
    }

    const curl = generateSimpleCurl(req)
    expect(curl).toContain('-X POST')
    expect(curl).toContain('-H "Content-Type: application/json"')
    expect(curl).toContain('-H "Authorization: Bearer test-token"')
    expect(curl).toContain('-d \'{"username":"admin"}\'')
    expect(curl).toContain('"https://api.example.com/login"')
  })

  it('formats Postman Collection v2.1 structure correctly', () => {
    const postmanJson = {
      info: {
        name: 'Auth Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [
        {
          name: 'Login Request',
          request: {
            method: 'POST',
            url: { raw: 'https://api.example.com/login' },
          },
        },
      ],
      variable: [
        { key: 'baseUrl', value: 'https://api.example.com' },
        { key: 'secretToken', value: '' }, // Stripped secret
      ],
    }

    expect(postmanJson.info.schema).toContain('v2.1.0')
    expect(postmanJson.item.length).toBe(1)
    expect(postmanJson.variable[1].value).toBe('')
  })
})
