import React, { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers, highlightActiveLineGutter } from '@codemirror/view'
import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { autocompletion, CompletionContext } from '@codemirror/autocomplete'
import { useWorkspaceStore } from '../../stores/useWorkspaceStore'

interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  height?: string
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  height = '100%',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { getAllVariablesList } = useWorkspaceStore()
  const variables = getAllVariablesList()

  useEffect(() => {
    if (!containerRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && onChange && !readOnly) {
        onChange(update.state.doc.toString())
      }
    })

    const varCompletion = (context: CompletionContext) => {
      const match = context.matchBefore(/\{\{([^}]*)/)
      if (!match) return null
      return {
        from: match.from,
        options: variables.map((v) => ({
          label: `{{${v.key}}}`,
          detail: `[${v.scope}]`,
          info: v.value ? `Value: ${v.value}` : '(empty)',
          apply: `{{${v.key}}}`,
          type: 'variable',
        })),
      }
    }

    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      json(),
      oneDark,
      updateListener,
      EditorView.lineWrapping,
    ]

    if (!readOnly && variables.length > 0) {
      extensions.push(
        autocompletion({
          override: [varCompletion],
        })
      )
    }

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true))
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
    }
  }, [readOnly])

  // Sync external value updates
  useEffect(() => {
    const view = viewRef.current
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      })
    }
  }, [value])

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded border border-[#1e293b] bg-[#090d16] text-xs font-mono"
      style={{ height }}
    />
  )
}
