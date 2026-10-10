import React, { useState, useEffect } from 'react'
import {
  Download,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  X,
  Zap,
} from 'lucide-react'
import {
  type UpdateInfo,
  CURRENT_VERSION,
  GITHUB_REPO,
  checkForAppUpdates,
  installTauriUpdate,
} from '../../utils/updater'

interface UpdateDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const UpdateDialog: React.FC<UpdateDialogProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [installSuccess, setInstallSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheck = async () => {
    setLoading(true)
    setError(null)
    setInstallSuccess(false)
    try {
      const res = await checkForAppUpdates()
      setUpdateInfo(res)
      if (res.error) {
        setError(res.error)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (downloading) return
    setUpdateInfo(null)
    setError(null)
    setDownloading(false)
    setProgress(null)
    setInstallSuccess(false)
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return
    let active = true
    setLoading(true)
    setError(null)
    checkForAppUpdates()
      .then((res) => {
        if (!active) return
        setUpdateInfo(res)
        if (res.error) setError(res.error)
      })
      .catch((err) => {
        if (!active) return
        setError((err as Error).message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [isOpen])

  const handleInstall = async () => {
    setDownloading(true)
    setError(null)
    try {
      await installTauriUpdate((downloaded, total) => {
        if (total && total > 0) {
          setProgress(Math.round((downloaded / total) * 100))
        }
      })
      setInstallSuccess(true)
    } catch (err) {
      setError((err as Error).message)
      setDownloading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      data-testid="update-dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none p-4"
    >
      <div className="w-full max-w-md rounded-xl border border-[#1e293b] bg-[#0b0f19] p-5 shadow-2xl text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#f97316] to-[#fbbf24] shadow-sm shadow-[#f97316]/30 text-white">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#f8fafc]">BeamREST Software Update</h3>
              <p className="text-[11px] text-[#94a3b8]">Current version: v{CURRENT_VERSION}</p>
            </div>
          </div>
          <button
            data-testid="update-dialog-close-btn"
            onClick={handleClose}
            disabled={downloading}
            className="rounded p-1 text-[#64748b] hover:bg-[#1e293b] hover:text-white transition-colors cursor-pointer disabled:opacity-30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3 text-[#94a3b8]">
              <RefreshCw className="h-6 w-6 animate-spin text-[#38bdf8]" />
              <span>Checking for latest updates...</span>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/30 p-3 text-xs text-[#fca5a5] flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-[#ef4444] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Failed to check for updates</p>
                <p className="text-[11px] text-[#fca5a5]/80 mt-0.5">{error}</p>
              </div>
            </div>
          ) : updateInfo?.available ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-[#131b2e] border border-[#38bdf8]/30 p-3">
                <div>
                  <span className="font-semibold text-[#38bdf8] text-sm">
                    New version available: v{updateInfo.latestVersion}
                  </span>
                  <p className="text-[11px] text-[#94a3b8] mt-0.5">
                    {updateInfo.releaseDate
                      ? `Released on ${new Date(updateInfo.releaseDate).toLocaleDateString()}`
                      : 'Recommended update'}
                  </p>
                </div>
                <span className="rounded bg-[#0ea5e9]/20 px-2 py-0.5 text-[10px] font-bold text-[#38bdf8] border border-[#0ea5e9]/40">
                  NEW
                </span>
              </div>

              {updateInfo.notes && (
                <div className="max-h-40 overflow-y-auto rounded-lg bg-[#080c14] p-3 text-[11px] text-[#cbd5e1] border border-[#1e293b] font-mono whitespace-pre-wrap">
                  {updateInfo.notes}
                </div>
              )}

              {/* Download Progress */}
              {downloading && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] text-[#94a3b8]">
                    <span>Downloading update package...</span>
                    <span>{progress !== null ? `${progress}%` : 'Preparing...'}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#1e293b] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#0284c7] to-[#38bdf8] transition-all duration-300"
                      style={{ width: `${progress || 10}%` }}
                    />
                  </div>
                </div>
              )}

              {installSuccess && (
                <div className="rounded-lg bg-[#10b981]/10 border border-[#10b981]/30 p-3 text-xs text-[#6ee7b7] flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#10b981] shrink-0" />
                  <span>Update ready. Restarting BeamREST...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
              <CheckCircle2 className="h-8 w-8 text-[#10b981]" />
              <p className="font-medium text-[#f8fafc] text-sm">BeamREST is up to date</p>
              <p className="text-[11px] text-[#64748b]">
                Version {CURRENT_VERSION} is currently the newest version available.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#1e293b]">
          <button
            data-testid="update-check-again-btn"
            onClick={handleCheck}
            disabled={loading || downloading}
            className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[#94a3b8] hover:bg-[#131b2e] hover:text-[#f8fafc] transition-colors cursor-pointer disabled:opacity-30"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Check Again</span>
          </button>

          <div className="flex items-center gap-2">
            {updateInfo?.available ? (
              updateInfo.hasNativeUpdater ? (
                <button
                  data-testid="update-install-btn"
                  onClick={handleInstall}
                  disabled={downloading || installSuccess}
                  className="flex items-center gap-1.5 rounded bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] px-3 py-1.5 font-medium text-white shadow-sm hover:from-[#0369a1] hover:to-[#0284c7] transition-all cursor-pointer disabled:opacity-50"
                >
                  {downloading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span>{downloading ? 'Installing...' : 'Install & Restart'}</span>
                </button>
              ) : (
                <a
                  href={updateInfo.downloadUrl || `https://github.com/${GITHUB_REPO}/releases/latest`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded bg-[#131b2e] border border-[#1e293b] px-3 py-1.5 font-medium text-[#38bdf8] hover:bg-[#1e293b] transition-colors"
                >
                  <span>View on GitHub</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )
            ) : (
              <button
                onClick={handleClose}
                className="rounded border border-[#1e293b] bg-[#131b2e] px-3 py-1.5 text-[#cbd5e1] hover:bg-[#1e293b] hover:text-white transition-colors cursor-pointer"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
