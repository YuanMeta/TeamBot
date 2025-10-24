import { memo, useEffect, useMemo, useState } from 'react'
import { useTheme } from 'remix-themes'
import { bundledLanguages, codeToHtml } from 'shiki'

export const FALLBACK_LANG = 'txt'

const langMap = new Set(Object.keys(bundledLanguages))
export interface SyntaxHighlighterProps {
  children: string
  enableTransformer?: boolean
  language: string
}

const SyntaxHighlighter = memo<SyntaxHighlighterProps>(
  ({ children, language }) => {
    const [theme] = useTheme()
    const lang = language?.toLowerCase()
    const [dom, setDom] = useState('')
    const matchedLanguage = useMemo(
      () => (langMap.has(language as any) ? language : FALLBACK_LANG),
      [language]
    )
    useEffect(() => {
      codeToHtml(children, {
        lang: matchedLanguage,
        theme: theme === 'dark' ? 'github-dark' : 'one-light'
      }).then((res) => {
        setDom(res)
      })
    }, [children, lang, theme])
    return (
      <div
        dangerouslySetInnerHTML={{
          __html: dom as string
        }}
        className={'text-sm'}
        dir='ltr'
      />
    )
  }
)

export default SyntaxHighlighter
