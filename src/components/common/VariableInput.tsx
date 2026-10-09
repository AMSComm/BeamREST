import React, { useState, useRef, useEffect } from 'react'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'
import { KeyRound, Shield } from 'lucide-react'

export interface VariableInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void
  disabled?: boolean
  autoFocus?: boolean
  'data-testid'?: string
}

export const VariableInput: React.FC<VariableInputProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  onKeyDown,
  onPaste,
  disabled = false,
  autoFocus = false,
  'data-testid': dataTestId,
}) => {
  const { getAllVariablesList } = useWorkspaceStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [matchStartIndex, setMatchStartIndex] = useState<number>(-1)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const variables = getAllVariablesList()
  const filtered = variables.filter((v) =>
    v.key.toLowerCase().includes(query.toLowerCase())
  )

  const checkTrigger = (input: HTMLInputElement, currentVal: string) => {
    const cursor = input.selectionStart ?? currentVal.length
    const beforeCursor = currentVal.slice(0, cursor)
    const match = beforeCursor.match(/\{\{([^}]*)$/)

    if (match && match.index !== undefined) {
      setMatchStartIndex(match.index)
      setQuery(match[1])
      setSelectedIndex(0)
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value
    onChange(newVal)
    checkTrigger(e.target, newVal)
  }

  const handleSelectVariable = (varKey: string) => {
    if (!inputRef.current) return
    const cursor = inputRef.current.selectionStart ?? value.length
    const start = matchStartIndex >= 0 ? matchStartIndex : cursor

    const before = value.slice(0, start)
    const after = value.slice(cursor)
    const inserted = `{{${varKey}}}`
    const updated = before + inserted + after

    onChange(updated)
    setIsOpen(false)

    // Set cursor right after the closing }}
    const newCursor = before.length + inserted.length
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.setSelectionRange(newCursor, newCursor)
      }
    }, 10)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isOpen && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filtered.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        handleSelectVariable(filtered[selectedIndex].key)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setIsOpen(false)
        return
      }
    }

    if (onKeyDown) {
      onKeyDown(e)
    }
  }

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        data-testid={dataTestId}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        onPaste={onPaste}
        onClick={(e) => checkTrigger(e.currentTarget, value)}
        onKeyUp={(e) => checkTrigger(e.currentTarget, value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={className}
      />

      {isOpen && filtered.length > 0 && (
        <div
          data-testid="variable-suggestions-dropdown"
          className="absolute left-0 top-full mt-1 z-50 w-80 max-h-56 overflow-y-auto rounded-lg border border-[#1e293b] bg-[#0b0f19] shadow-2xl p-1 text-xs select-none"
        >
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#64748b] border-b border-[#1e293b] mb-1">
            <span>Variables Suggestion</span>
            <span className="font-mono text-[#38bdf8] lowercase">insert with enter / tab</span>
          </div>

          <div className="space-y-0.5">
            {filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={item.key}
                  data-testid={`variable-suggestion-item-${item.key}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelectVariable(item.key)
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between rounded px-2 py-1.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#131b2e] text-white border border-[#38bdf8]/40'
                      : 'text-[#cbd5e1] hover:bg-[#0e1322] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    <KeyRound className="h-3 w-3 text-[#38bdf8] shrink-0" />
                    <span className="font-mono font-semibold text-[#38bdf8]">
                      {`{{${item.key}}}`}
                    </span>
                    <span className="font-mono text-[10px] text-[#64748b] truncate max-w-[120px]">
                      {item.is_secret ? '••••••••' : item.value || '(empty)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {item.is_secret && (
                      <span className="flex items-center gap-0.5 rounded bg-[#f59e0b]/20 px-1 py-0.2 text-[9px] text-[#f59e0b]">
                        <Shield className="h-2.5 w-2.5" />
                        sec
                      </span>
                    )}
                    <span className="rounded bg-[#1e293b] px-1.5 py-0.2 text-[9px] text-[#94a3b8] uppercase font-mono">
                      {item.scope}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
