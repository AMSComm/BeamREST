import type { Update } from '@tauri-apps/plugin-updater'

export interface UpdateInfo {
  available: boolean
  currentVersion: string
  latestVersion?: string
  releaseDate?: string
  notes?: string
  downloadUrl?: string
  isTauri: boolean
  error?: string
  hasNativeUpdater?: boolean
}

export const CURRENT_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.5'
export const GITHUB_REPO = 'AMSComm/BeamREST'

let cachedAppVersion: string | null = null

export async function getAppVersion(): Promise<string> {
  if (cachedAppVersion) return cachedAppVersion

  const isTauri =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
        (window as unknown as { __TAURI__?: unknown }).__TAURI__
    )

  if (isTauri) {
    // 1. Direct Rust command query
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const ver = await invoke<string>('get_app_version_cmd')
      if (ver) {
        cachedAppVersion = ver
        return ver
      }
    } catch {
      // fallback
    }

    // 2. Tauri App plugin API
    try {
      const { getVersion } = await import('@tauri-apps/api/app')
      const ver = await getVersion()
      if (ver) {
        cachedAppVersion = ver
        return ver
      }
    } catch {
      // fallback
    }
  }

  cachedAppVersion = CURRENT_VERSION
  return CURRENT_VERSION
}

export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
  const parts2 = v2.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0
    const p2 = parts2[i] || 0
    if (p1 > p2) return 1
    if (p1 < p2) return -1
  }
  return 0
}

let cachedUpdate: Update | null = null

export async function checkForAppUpdates(): Promise<UpdateInfo> {
  const isTauri =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
        (window as unknown as { __TAURI__?: unknown }).__TAURI__
    )

  const currentVer = await getAppVersion()

  if (isTauri) {
    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const update = await check()
      cachedUpdate = update
      if (update) {
        return {
          available: true,
          currentVersion: currentVer,
          latestVersion: update.version,
          releaseDate: update.date,
          notes: update.body || 'New features and performance improvements.',
          isTauri: true,
          hasNativeUpdater: true,
        }
      }
      return {
        available: false,
        currentVersion: currentVer,
        latestVersion: currentVer,
        isTauri: true,
        hasNativeUpdater: true,
      }
    } catch (err) {
      console.warn('Tauri native updater check error, falling back to GitHub API:', err)
    }
  }

  // Fallback or Web preview: check GitHub latest release API
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    })
    if (!res.ok) {
      if (res.status === 404) {
        return {
          available: false,
          currentVersion: currentVer,
          latestVersion: currentVer,
          isTauri,
          notes: 'No releases published yet on GitHub repository.',
        }
      }
      throw new Error(`GitHub API returned ${res.status}`)
    }
    const data = await res.json()
    const latestTag = (data.tag_name || '').replace(/^v/, '')
    const isNewer = compareVersions(latestTag, currentVer) > 0

    return {
      available: isNewer,
      currentVersion: currentVer,
      latestVersion: latestTag,
      releaseDate: data.published_at,
      notes: data.body,
      downloadUrl: data.html_url,
      isTauri,
      hasNativeUpdater: false,
    }
  } catch (err) {
    return {
      available: false,
      currentVersion: currentVer,
      latestVersion: currentVer,
      isTauri,
      error: (err as Error).message,
    }
  }
}

export async function restartApp(): Promise<void> {
  const isTauri =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
        (window as unknown as { __TAURI__?: unknown }).__TAURI__
    )

  if (isTauri) {
    // 1. First attempt: Direct Rust command restart (spawns binary and exits cleanest)
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('restart_app_cmd')
      return
    } catch (err) {
      console.warn('restart_app_cmd failed, falling back to plugin-process relaunch:', err)
    }

    // 2. Second attempt: Tauri plugin-process relaunch
    try {
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
      return
    } catch (err) {
      console.error('Plugin-process relaunch failed:', err)
    }
  }

  // Fallback for browser / dev environment
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}

export async function installTauriUpdate(
  onProgress?: (downloaded: number, total?: number) => void
): Promise<void> {
  const { check } = await import('@tauri-apps/plugin-updater')

  let update = cachedUpdate
  if (!update) {
    update = await check()
  }
  if (!update) throw new Error('No update available')

  let downloaded = 0
  let contentLength = 0
  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case 'Started':
        contentLength = event.data.contentLength || 0
        if (onProgress) onProgress(0, contentLength)
        break
      case 'Progress':
        downloaded += event.data.chunkLength
        if (onProgress) onProgress(downloaded, contentLength)
        break
      case 'Finished':
        if (onProgress) onProgress(contentLength, contentLength)
        break
    }
  })

  // Automatically restart the app to finalize update installation
  await restartApp()
}
