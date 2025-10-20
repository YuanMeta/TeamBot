import { memo, useMemo, type CSSProperties } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import type { Pluggable } from 'unified'

import { rehypeKatexDir } from './plugins/katexDir'
import { useComponents } from './components'

export interface MarkdownProps {
  allowHtml?: boolean
  children: string
  className?: string
  enableImageGallery?: boolean
  enableLatex?: boolean
  enableMermaid?: boolean
  fullFeaturedCodeBlock?: boolean
  onDoubleClick?: () => void
  rehypePlugins?: Pluggable[]
  remarkPlugins?: Pluggable[]
  remarkPluginsAhead?: Pluggable[]
  showFootnotes?: boolean
  style?: CSSProperties
  variant?: 'normal' | 'chat'
  fontSize?: number
  headerMultiple?: number
  lineHeight?: number
  marginMultiple?: number
}

const Markdown = memo<MarkdownProps>(
  ({
    children,
    className,
    style,
    onDoubleClick,
    enableLatex = true,
    enableMermaid = true,
    allowHtml,
    variant = 'normal',
    rehypePlugins,
    remarkPlugins,
    remarkPluginsAhead,
    ...rest
  }) => {
    const isChatMode = variant === 'chat'

    const memoComponents = useComponents()

    const innerRehypePlugins = Array.isArray(rehypePlugins) ? rehypePlugins : [rehypePlugins]

    const memoRehypePlugins = useMemo(
      () =>
        [
          allowHtml && rehypeRaw,
          enableLatex && rehypeKatex,
          enableLatex && rehypeKatexDir,
          ...innerRehypePlugins
        ].filter(Boolean) as any,
      [allowHtml, enableLatex, ...innerRehypePlugins]
    )

    const innerRemarkPlugins = Array.isArray(remarkPlugins) ? remarkPlugins : [remarkPlugins]
    const innerRemarkPluginsAhead = Array.isArray(remarkPluginsAhead)
      ? remarkPluginsAhead
      : [remarkPluginsAhead]

    const memoRemarkPlugins = useMemo(
      () =>
        [
          ...innerRemarkPluginsAhead,
          remarkGfm,
          remarkMath,
          isChatMode && remarkBreaks,
          ...innerRemarkPlugins
        ].filter(Boolean) as any,
      [isChatMode, enableLatex, ...innerRemarkPluginsAhead, ...innerRemarkPlugins]
    )

    return (
      <div
        className={`message-markdown w-full max-w-full`}
        data-code-type="markdown"
        onDoubleClick={onDoubleClick}
        style={style}
      >
        <ReactMarkdown
          components={memoComponents}
          rehypePlugins={memoRehypePlugins}
          remarkPlugins={memoRemarkPlugins}
          {...rest}
        >
          {children}
        </ReactMarkdown>
      </div>
    )
  }
)

export default Markdown
