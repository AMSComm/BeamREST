import { BeamRequest, KeyValuePair, AuthConfig } from '../types'

/**
 * Parses a standard cURL command into a partial BeamRequest.
 * Supports multi-line cURL (with \ continuations), methods, headers, auth, and bodies.
 */
export function parseCurlCommand(rawInput: string): Partial<BeamRequest> | null {
  const trimmed = rawInput.trim()
  if (!trimmed.toLowerCase().startsWith('curl')) {
    return null
  }

  // Normalize multi-line escaped commands
  const singleLine = trimmed
    .replace(/\\\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Tokenize preserving quoted strings
  const tokens: string[] = []
  const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(singleLine)) !== null) {
    if (match[1] !== undefined) {
      tokens.push(match[1]) // Double quoted
    } else if (match[2] !== undefined) {
      tokens.push(match[2]) // Single quoted
    } else {
      tokens.push(match[0]) // Unquoted
    }
  }

  if (tokens.length < 2) return null

  let method = 'GET'
  let url = ''
  const headers: KeyValuePair[] = []
  let bodyContent = ''
  let bodyType: 'none' | 'json' | 'urlencoded' | 'raw' = 'none'
  let auth: AuthConfig | undefined = undefined

  let i = 1
  while (i < tokens.length) {
    const token = tokens[i]

    if (token === '-X' || token === '--request') {
      if (i + 1 < tokens.length) {
        method = tokens[i + 1].toUpperCase()
        i += 2
        continue
      }
    } else if (token === '-H' || token === '--header') {
      if (i + 1 < tokens.length) {
        const headerStr = tokens[i + 1]
        const colonIdx = headerStr.indexOf(':')
        if (colonIdx > 0) {
          const key = headerStr.slice(0, colonIdx).trim()
          const value = headerStr.slice(colonIdx + 1).trim()

          // Check if Authorization Bearer header
          if (key.toLowerCase() === 'authorization' && value.toLowerCase().startsWith('bearer ')) {
            auth = {
              type: 'bearer',
              token: value.slice(7).trim(),
            }
          }

          headers.push({ key, value, enabled: true })
        }
        i += 2
        continue
      }
    } else if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary'
    ) {
      if (i + 1 < tokens.length) {
        bodyContent = tokens[i + 1]
        if (method === 'GET') {
          method = 'POST' // Default to POST when body is present
        }

        // Try detecting JSON
        try {
          JSON.parse(bodyContent)
          bodyType = 'json'
        } catch {
          bodyType = 'raw'
        }

        i += 2
        continue
      }
    } else if (token === '--data-urlencode') {
      if (i + 1 < tokens.length) {
        bodyContent = tokens[i + 1]
        bodyType = 'urlencoded'
        if (method === 'GET') method = 'POST'
        i += 2
        continue
      }
    } else if (token === '-u' || token === '--user') {
      if (i + 1 < tokens.length) {
        const userPass = tokens[i + 1]
        const colonIdx = userPass.indexOf(':')
        if (colonIdx >= 0) {
          auth = {
            type: 'basic',
            username: userPass.slice(0, colonIdx),
            password: userPass.slice(colonIdx + 1),
          }
        }
        i += 2
        continue
      }
    } else if (token.startsWith('http://') || token.startsWith('https://')) {
      url = token
    } else if (token === '--url' && i + 1 < tokens.length) {
      url = tokens[i + 1]
      i += 2
      continue
    }

    i++
  }

  // Parse query parameters from URL if present
  const params: KeyValuePair[] = []
  if (url.includes('?')) {
    const [baseUrl, query] = url.split('?')
    url = baseUrl
    const searchParams = new URLSearchParams(query)
    searchParams.forEach((val, key) => {
      params.push({ key, value: val, enabled: true })
    })
  }

  if (!url) return null

  return {
    method,
    url,
    headers,
    params,
    body_type: bodyType,
    body_content: bodyContent,
    auth,
  }
}
