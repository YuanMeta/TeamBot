import { type FC } from 'react'

import Highlighter, { type HighlighterProps } from './highlighter'
import Mermaid, { type MermaidProps } from '../mermaid'
import Snippet, { type SnippetProps } from '../snippet'
import { FALLBACK_LANG } from './SyntaxHighlighter'

export type PreProps = HighlighterProps

export const Pre: FC<PreProps> = ({
  fullFeatured,
  fileName,
  language = FALLBACK_LANG,
  children,
  ...rest
}) => {
  return (
    <Highlighter
      fileName={fileName}
      fullFeatured={fullFeatured}
      language={language}
      type='block'
      {...rest}
    >
      {children}
    </Highlighter>
  )
}

export const PreSingleLine: FC<SnippetProps> = ({
  language = FALLBACK_LANG,
  children,
  ...rest
}) => {
  return (
    <Snippet
      data-code-type='highlighter'
      language={language}
      type={'block'}
      {...rest}
    >
      {children}
    </Snippet>
  )
}

export const PreMermaid: FC<MermaidProps> = ({ children, type, ...rest }) => {
  return <Mermaid {...rest}>{children}</Mermaid>
}

export default Pre
