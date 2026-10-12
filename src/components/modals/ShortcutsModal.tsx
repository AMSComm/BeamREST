import { X, Keyboard } from 'lucide-react'

import { useWorkspaceStore } from '../../stores/useWorkspaceStore'

export const ShortcutsModal: React.FC = () => {
  const { isShortcutsModalOpen, setShortcutsModalOpen } = useWorkspaceStore()

  if (!isShortcutsModalOpen) return null

  const SHORTCUTS = [
    {
      category: 'Request Execution',
      items: [
        { keys: ['⌘', 'Enter'], label: 'Execute active HTTP request' },
        { keys: ['⌘', 'S'], label: 'Save active request to disk' },
        { keys: ['⌘', '⇧', 'C'], label: 'Copy request as cURL command' },
      ],
    },
    {
      category: 'Project & Workspace Management',
      items: [
        { keys: ['⌘', 'N'], label: 'Create new request' },
        { keys: ['⌘', 'D'], label: 'Clone / duplicate active request' },
        { keys: ['⌘', '⇧', 'N'], label: 'Create new project / collection' },
        { keys: ['⌘', 'O'], label: 'Open workspace directory' },
      ],
    },
    {
      category: 'Variables & Sharing',
      items: [
        { keys: ['⌘', 'E'], label: 'Manage Environment & Project variables' },
        { keys: ['⌘', '⇧', 'E'], label: 'Open Postman export dialog' },
        { keys: ['?'], label: 'Open keyboard shortcuts cheat-sheet' },
      ],
    },
    {
      category: 'Tab Navigation (when focused in request pane)',
      items: [
        { keys: ['⌥', '1'], label: 'Switch to Params tab' },
        { keys: ['⌥', '2'], label: 'Switch to Headers tab' },
        { keys: ['⌥', '3'], label: 'Switch to Body tab' },
        { keys: ['⌥', '4'], label: 'Switch to Auth tab' },
        { keys: ['⌥', '5'], label: 'Switch to Auto Extractors tab' },
      ],
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-xs select-none">
      <div className="w-[520px] rounded-lg border border-[#1e293b] bg-[#0b0f19] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#1e293b] bg-[#0e1322] px-4 py-3">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Keyboard className="h-4 w-4 text-[#38bdf8]" />
            <span>Keyboard Shortcuts</span>
          </div>
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="rounded p-1 text-[#64748b] hover:bg-[#1e293b] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[460px] overflow-y-auto p-4 space-y-4">
          {SHORTCUTS.map((sec, i) => (
            <div key={i} className="space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
                {sec.category}
              </h4>
              <div className="rounded border border-[#1e293b] bg-[#0e1322] divide-y divide-[#1e293b]">
                {sec.items.map((item, j) => (
                  <div key={j} className="flex items-center justify-between px-3 py-2">
                    <span className="text-[#cbd5e1]">{item.label}</span>
                    <div className="flex items-center gap-1 font-mono">
                      {item.keys.map((k, idx) => (
                        <kbd
                          key={idx}
                          className="rounded border border-[#334155] bg-[#1e293b] px-1.5 py-0.5 text-[11px] font-semibold text-white shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-[#1e293b] bg-[#0e1322] px-4 py-2.5">
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="rounded bg-[#0284c7] px-4 py-1.5 font-semibold text-white hover:bg-[#0369a1]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
