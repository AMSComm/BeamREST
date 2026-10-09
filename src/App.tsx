import React, { useEffect } from 'react'
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { RequestPane } from './components/request/RequestPane'
import { ResponsePane } from './components/response/ResponsePane'
import { EnvironmentModal } from './components/modals/EnvironmentModal'
import { ExportModal } from './components/modals/ExportModal'
import { useWorkspaceStore } from './stores/useWorkspaceStore'
import { tauriApi } from './services/tauriApi'

export const App: React.FC = () => {
  const {
    loadWorkspace,
    initWorkspace,
    sendRequest,
    saveActiveRequest,
  } = useWorkspaceStore()

  // On mount: restore last active workspace or initialize default
  useEffect(() => {
    const initApp = async () => {
      const lastPath = await tauriApi.getLastWorkspacePath()
      if (lastPath) {
        try {
          await loadWorkspace(lastPath)
          return
        } catch {
          // fallback
        }
      }

      // Default mock/demo workspace
      await initWorkspace('/tmp/beamrest-demo-workspace', 'Demo API Workspace')
    }

    initApp()
  }, [])

  // Global Keyboard Shortcuts (Cmd+Enter to send, Cmd+S to save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey
      if (isCmdOrCtrl && e.key === 'Enter') {
        e.preventDefault()
        sendRequest()
      } else if (isCmdOrCtrl && e.key === 's') {
        e.preventDefault()
        saveActiveRequest()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sendRequest, saveActiveRequest])

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0b0f19] text-[#f8fafc] overflow-hidden select-none">
      {/* Top Header */}
      <Header />

      {/* Main Workspace Split Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Explorer Sidebar */}
        <Sidebar />

        {/* Center Request Editor & Right Response Viewer Split */}
        <main className="flex flex-1 overflow-hidden">
          <div className="flex w-1/2 flex-col overflow-hidden">
            <RequestPane />
          </div>
          <div className="flex w-1/2 flex-col overflow-hidden">
            <ResponsePane />
          </div>
        </main>
      </div>

      {/* Modals */}
      <EnvironmentModal />
      <ExportModal />
    </div>
  )
}

export default App
