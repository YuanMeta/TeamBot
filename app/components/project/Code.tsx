import { useCallback, useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { json as jsonLanguage } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import { githubLight } from '@uiw/codemirror-theme-github'
import { useTheme } from 'remix-themes'

export type CodeEditorLanguage = 'javascript' | 'json'

export interface CodeEditorProps {
  value?: string
  language?: CodeEditorLanguage
  onChange?: (value: string) => void
  readOnly?: boolean
  height?: string
  className?: string
}

export function CodeEditor({
  value,
  language = 'javascript',
  onChange,
  readOnly = false,
  height = '320px',
  className
}: CodeEditorProps) {
  const [theme] = useTheme()
  const extensions = useMemo(() => {
    if (language === 'json') {
      return [jsonLanguage()]
    }

    return [
      javascript({
        jsx: true,
        typescript: false
      })
    ]
  }, [language])

  const handleChange = useCallback(
    (editorValue: string) => {
      onChange?.(editorValue)
    },
    [onChange]
  )

  const resolvedTheme = useMemo(() => {
    if (theme) {
      return theme
    }

    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark')
        ? 'dark'
        : 'light'
    }

    return 'light'
  }, [theme])

  const codeMirrorTheme = resolvedTheme === 'dark' ? oneDark : githubLight

  return (
    <CodeMirror
      value={value}
      extensions={extensions}
      height={height}
      editable={!readOnly}
      className={className}
      onChange={handleChange}
      theme={codeMirrorTheme}
      basicSetup={{
        autocompletion: true,
        foldGutter: true,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        lineNumbers: true
      }}
    />
  )
}

export default CodeEditor
