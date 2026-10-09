import React, { useEffect } from 'react'
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { RequestPane } from './components/request/RequestPane'
import { ResponsePane } from './components/response/ResponsePane'
import { EnvironmentModal } from './components/modals/EnvironmentModal'
import { ExportModal } from './components/modals/ExportModal'
import { NewProjectModal } from './components/modals/NewProjectModal'
import { NewRequestModal } from './components/modals/NewRequestModal'
import { ConfirmDeleteModal } from './components/modals/ConfirmDeleteModal'
import { ShortcutsModal } from './components/modals/ShortcutsModal'
import { useWorkspaceStore } from './stores/useWorkspaceStore'
import { tauriApi } from './services/tauriApi'

export const App: React.FC = () => {
  const {
    loadWorkspace,
    initWorkspace,
    sendRequest,
    saveActiveRequest,
    copyCurl,
    setActiveTab,
    setEnvModalOpen,
    setExportModalOpen,
    setNewProjectModalOpen,
    openNewRequestModal,
    setShortcutsModalOpen,
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

      // Default demo workspace
      await initWorkspace('/tmp/beamrest-demo-workspace', 'Demo API Workspace')
    }

    initApp()
  }, [])

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey
      const isShift = e.shiftKey
      const isAlt = e.altKey
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      const isInputFocused = targetTag === 'input' || targetTag === 'textarea'

      // Cmd+Enter: Send request
      if (isCmdOrCtrl && e.key === 'Enter') {
        e.preventDefault()
        sendRequest()
      }
      // Cmd+S: Save request
      else if (isCmdOrCtrl && e.key === 's') {
        e.preventDefault()
        saveActiveRequest()
      }
      // Cmd+Shift+C: Copy cURL
      else if (isCmdOrCtrl && isShift && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        copyCurl()
      }
      // Cmd+Shift+N: New Project
      else if (isCmdOrCtrl && isShift && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setNewProjectModalOpen(true)
      }
      // Cmd+N: New Request
      else if (isCmdOrCtrl && !isShift && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        openNewRequestModal()
      }
      // Cmd+Shift+E: Export Postman
      else if (isCmdOrCtrl && isShift && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        setExportModalOpen(true)
      }
      // Cmd+E: Variables
      else if (isCmdOrCtrl && !isShift && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        setEnvModalOpen(true)
      }
      // Question mark (?): Shortcuts Cheat Sheet (when not typing in text field)
      else if (e.key === '?' && !isInputFocused) {
        e.preventDefault()
        setShortcutsModalOpen(true)
      }
      // Option + 1..5: Quick Tab Switching
      else if (isAlt && e.key === '1') {
        e.preventDefault()
        setActiveTab('params')
      } else if (isAlt && e.key === '2') {
        e.preventDefault()
        setActiveTab('headers')
      } else if (isAlt && e.key === '3') {
        e.preventDefault()
        setActiveTab('body')
      } else if (isAlt && e.key === '4') {
        e.preventDefault()
        setActiveTab('auth')
      } else if (isAlt && e.key === '5') {
        e.preventDefault()
        setActiveTab('extractors')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    sendRequest,
    saveActiveRequest,
    copyCurl,
    setActiveTab,
    setEnvModalOpen,
    setExportModalOpen,
    setNewProjectModalOpen,
    openNewRequestModal,
    setShortcutsModalOpen,
  ])

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
      <NewProjectModal />
      <NewRequestModal />
      <ConfirmDeleteModal />
      <ShortcutsModal />
    </div>
  )
}

export default App
