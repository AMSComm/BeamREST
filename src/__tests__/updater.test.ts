import { describe, it, expect } from 'vitest'
import { compareVersions } from '../utils/updater'

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
})
