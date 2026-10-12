import React, { useEffect, useState, useRef, useCallback } from 'react'
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
import { NewWorkspaceModal } from './components/modals/NewWorkspaceModal'
import { ProxyModal } from './components/modals/ProxyModal'
import { UpdateDialog } from './components/common/UpdateDialog'
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
    isUpdateModalOpen,
    setUpdateModalOpen,
    closeTopModal,
  } = useWorkspaceStore()

  // Resizable panels state
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('beamrest:sidebar_width')
    const parsed = saved ? parseInt(saved, 10) : 260
    return isNaN(parsed) ? 260 : Math.max(180, Math.min(450, parsed))
  })

  const [splitRatio, setSplitRatio] = useState<number>(() => {
    const saved = localStorage.getItem('beamrest:split_ratio')
    const parsed = saved ? parseFloat(saved) : 50
    return isNaN(parsed) ? 50 : Math.max(25, Math.min(75, parsed))
  })

  const [draggingType, setDraggingType] = useState<'sidebar' | 'split' | null>(null)
  const mainContainerRef = useRef<HTMLElement>(null)

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
      // Escape: Close topmost active modal/dialog first
      if (e.key === 'Escape') {
        if (closeTopModal()) {
          e.preventDefault()
          return
        }
      }

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
      // Cmd+D: Clone Active Request
      else if (isCmdOrCtrl && !isShift && e.key.toLowerCase() === 'd') {
        const { activeProjectId, activeRequestId, cloneRequest } = useWorkspaceStore.getState()
        if (activeProjectId && activeRequestId) {
          e.preventDefault()
          cloneRequest(activeProjectId, activeRequestId)
        }
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
    closeTopModal,
  ])

  // Mouse move and up handlers for resizing
  useEffect(() => {
    if (!draggingType) return

    const handleMouseMove = (e: MouseEvent) => {
      if (draggingType === 'sidebar') {
        const clamped = Math.max(180, Math.min(450, e.clientX))
        setSidebarWidth(clamped)
        localStorage.setItem('beamrest:sidebar_width', String(clamped))
      } else if (draggingType === 'split') {
        if (!mainContainerRef.current) return
        const rect = mainContainerRef.current.getBoundingClientRect()
        const rawRatio = ((e.clientX - rect.left) / rect.width) * 100
        const clamped = Math.max(25, Math.min(75, rawRatio))
        setSplitRatio(clamped)
        localStorage.setItem('beamrest:split_ratio', String(clamped))
      }
    }

    const handleMouseUp = () => {
      setDraggingType(null)
    }

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingType])

  const handleSidebarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setDraggingType('sidebar')
  }, [])

  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setDraggingType('split')
  }, [])

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0b0f19] text-[#f8fafc] overflow-hidden select-none">
      {/* Top Header */}
      <Header />

      {/* Main Workspace Split Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Explorer Sidebar */}
        <div style={{ width: sidebarWidth }} className="flex h-full shrink-0 overflow-hidden">
          <Sidebar />
        </div>

        {/* Sidebar Resizer Divider */}
        <div
          data-testid="sidebar-resizer"
          onMouseDown={handleSidebarMouseDown}
          className={`relative w-1 shrink-0 cursor-col-resize select-none transition-colors ${
            draggingType === 'sidebar' ? 'bg-[#38bdf8]' : 'bg-[#1e293b] hover:bg-[#38bdf8]'
          }`}
          title="Drag to resize sidebar (180px - 450px)"
        >
          <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
        </div>

        {/* Center Request Editor & Right Response Viewer Split */}
        <main ref={mainContainerRef} className="flex flex-1 overflow-hidden">
          <div style={{ width: `${splitRatio}%` }} className="flex flex-col overflow-hidden h-full">
            <RequestPane />
          </div>

          {/* Split Pane Resizer Divider */}
          <div
            data-testid="split-resizer"
            onMouseDown={handleSplitMouseDown}
            className={`relative w-1 shrink-0 cursor-col-resize select-none transition-colors ${
              draggingType === 'split' ? 'bg-[#38bdf8]' : 'bg-[#1e293b] hover:bg-[#38bdf8]'
            }`}
            title="Drag to resize panels (25% - 75%)"
          >
            <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
          </div>

          <div style={{ width: `${100 - splitRatio}%` }} className="flex flex-col overflow-hidden h-full">
            <ResponsePane />
          </div>
        </main>
      </div>

      {/* Modals */}
      <NewWorkspaceModal />
      <ProxyModal />
      <EnvironmentModal />
      <ExportModal />
      <NewProjectModal />
      <NewRequestModal />
      <ConfirmDeleteModal />
      <ShortcutsModal />
      <UpdateDialog
        isOpen={isUpdateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
      />
    </div>
  )
}

export default App
