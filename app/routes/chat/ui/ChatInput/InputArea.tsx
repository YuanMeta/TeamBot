import { observer } from 'mobx-react-lite'
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  CLEAR_HISTORY_COMMAND,
  COMMAND_PRIORITY_HIGH,
  KEY_DOWN_COMMAND,
  type EditorState
} from 'lexical'
import { useEffect, useRef, type RefObject } from 'react'

import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { OnChangePlugin as LexicalOnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import isHotkey from 'is-hotkey'
const initialConfig = {
  namespace: 'ChatInput',
  theme: {},
  onError: (error: Error) => {
    console.error(error)
  }
}

function KeyboardPlugin({ onSend }: { onSend: (text: string) => void }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    const unregister = editor.registerCommand(
      KEY_DOWN_COMMAND,
      (e) => {
        if (isHotkey('enter', e)) {
          e.preventDefault()
          const root = $getRoot()
          const text = root.getTextContent()
          if (text.trim()) {
            onSend(text)
          }
          root.clear()
          root.append($createParagraphNode())
          editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined)
          return true
        }
        if (isHotkey('mod+enter', e) || isHotkey('shift+enter', e)) {
          editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
              const lineBreakNode = $createLineBreakNode()
              selection.insertNodes([lineBreakNode])
            }
          })
          e.preventDefault()
          return true
        }
        return false
      },
      COMMAND_PRIORITY_HIGH
    )
    return () => {
      unregister()
    }
  }, [editor, onSend])
  return null
}

function OnChangeValuePlugin({
  onChange
}: {
  onChange: (text: string) => void
}) {
  const handleChange = (editorState: EditorState) => {
    editorState.read(() => {
      const root = $getRoot()
      const text = root.getTextContent()
      onChange(text)
    })
  }

  return <LexicalOnChangePlugin onChange={handleChange} />
}

function SyncValuePlugin({ value }: { value: string }) {
  const [editor] = useLexicalComposerContext()
  const isInternalUpdate = useRef(false)

  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false
      return
    }

    editor.update(() => {
      const root = $getRoot()
      const currentText = root.getTextContent()

      if (currentText !== value) {
        root.clear()
        if (value) {
          const lines = value.split('\n')
          const paragraph = $createParagraphNode()

          lines.forEach((line, i) => {
            if (i > 0) {
              paragraph.append($createLineBreakNode())
            }
            if (line) {
              paragraph.append($createTextNode(line))
            }
          })

          root.append(paragraph)
        } else {
          root.append($createParagraphNode())
        }
      }
    })
  }, [editor, value])

  return null
}

export const InputArea = observer(
  ({
    onSend,
    value,
    onChange,
    onAddFile
  }: {
    onSend: (text: string) => void
    value: string
    onChange: (text: string) => void
    onAddFile: (file: File) => void
  }) => {
    return (
      <LexicalComposer initialConfig={initialConfig}>
        <div
          className={
            'w-full h-full pt-1 pb-2 px-1 outline-none text-base relative'
          }
        >
          <PlainTextPlugin
            contentEditable={
              <ContentEditable
                className={
                  'w-full h-full outline-none text-base relative text-black/90 dark:text-white/90'
                }
                id={'chat-input'}
                spellCheck={false}
                onPaste={(e) => {
                  const files = e.clipboardData.files
                  if (files) {
                    onAddFile(files[0])
                  }
                }}
                aria-placeholder={'Ask me anything...'}
                placeholder={
                  <div
                    className={
                      'absolute top-1 left-1.5 text-black/50 dark:text-white/50 pointer-events-none'
                    }
                  >
                    Ask me anything...
                  </div>
                }
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <KeyboardPlugin onSend={onSend} />
          <OnChangeValuePlugin onChange={onChange} />
          <SyncValuePlugin value={value} />
        </div>
        <HistoryPlugin />
        <AutoFocusPlugin />
      </LexicalComposer>
    )
  }
)
