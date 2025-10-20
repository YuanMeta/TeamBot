import { observer } from 'mobx-react-lite'
import {
  $createLineBreakNode,
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  CLEAR_HISTORY_COMMAND,
  COMMAND_PRIORITY_HIGH,
  KEY_DOWN_COMMAND,
  type EditorState
} from 'lexical'
import { useEffect, type RefObject } from 'react'

import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import isHotkey from 'is-hotkey'
const initialConfig = {
  namespace: 'ChatInput',
  theme: {},
  onError: (error: Error) => {
    console.error(error)
  }
}
function ExposeFocusPlugin({
  instance
}: {
  instance?: RefObject<{
    focus?: () => void
  }>
}) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    if (!instance || !instance.current) return
    instance.current.focus = () => {
      const root = editor.getRootElement()
      if (root) {
        root.focus()
      } else {
        // fallback
        editor.focus()
      }
    }
    return () => {
      if (instance && instance.current) {
        delete instance.current.focus
      }
    }
  }, [editor, instance])
  return null
}
function OnChangePlugin({ onSend }: { onSend: (text: string) => void }) {
  const [editor] = useLexicalComposerContext()
  useEffect(() => {
    return editor.registerCommand(
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
  }, [editor, onSend])
  return null
}

export const InputArea = observer(
  ({
    onSend,
    instance,
    onAddFile
  }: {
    onSend: (text: string) => void
    instance?: RefObject<{
      focus?: () => void
    }>
    onAddFile: (file: File) => void
  }) => {
    return (
      <LexicalComposer initialConfig={initialConfig}>
        <div className={'w-full h-full pt-1 pb-2 px-1 outline-none text-base relative'}>
          <PlainTextPlugin
            contentEditable={
              <ContentEditable
                className={
                  'w-full h-full outline-none text-base relative text-black/90 dark:text-white/90'
                }
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
          <OnChangePlugin
            onSend={(text) => {
              onSend(text)
            }}
          />
          <ExposeFocusPlugin instance={instance} />
        </div>
        <HistoryPlugin />
        <AutoFocusPlugin />
      </LexicalComposer>
    )
  }
)
