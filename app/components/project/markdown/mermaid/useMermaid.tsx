import mermaid from 'mermaid'
import { useCallback, useEffect, useState } from 'react'
import { useTheme } from 'remix-themes'

export const useMermaid = (content: string) => {
  const [mermaidContent, setMermaidContent] = useState<string>()
  const [theme] = useTheme()
  useEffect(() => {
    mermaid.initialize({
      securityLevel: 'loose',
      startOnLoad: true,
      theme: theme === 'dark' ? 'dark' : 'base'
    })
    mermaid.contentLoaded()
  }, [mermaidContent, theme])

  const checkSyntax = async (textStr: string) => {
    try {
      if (await mermaid.parse(textStr)) {
        setMermaidContent(textStr)
      }
    } catch {}
  }

  useEffect(() => {
    checkSyntax(content)
  }, [content])

  return useCallback(() => {
    return (
      <pre
        className={'mermaid w-full'}
        style={{
          alignItems: 'center',
          display: 'flex',
          fontSize: 14,
          justifyContent: 'center',
          overflow: 'auto'
        }}
      >
        {mermaidContent}
      </pre>
    )
  }, [mermaidContent, theme])
}
