import { describe, it, expect } from 'vitest'
import { compareVersions, getAppVersion, CURRENT_VERSION } from '../utils/updater'

describe('Updater Version Comparison', () => {
  it('correctly compares semantic versions', () => {
    expect(compareVersions('0.1.1', '0.1.0')).toBe(1)
    expect(compareVersions('0.1.0', '0.1.1')).toBe(-1)
    expect(compareVersions('0.1.0', '0.1.0')).toBe(0)
    expect(compareVersions('v0.2.0', '0.1.9')).toBe(1)
    expect(compareVersions('1.0.0', 'v0.9.9')).toBe(1)
  })

  it('handles irregular or missing patch digits', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0)
    expect(compareVersions('1.1', '1.0.5')).toBe(1)
  })

  it('resolves current app version dynamically without hardcoded mismatch', async () => {
    expect(CURRENT_VERSION).toBe('0.1.4')
    const resolved = await getAppVersion()
    expect(resolved).toBe('0.1.4')
  })
})
