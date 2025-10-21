import { memo } from 'react'
import SyntaxHighlighter from '../code/SyntaxHighlighter'

export interface SnippetProps {
  /**
   * @description The content to be displayed inside the Snippet component
   */
  children: string
  /**
   * @description Whether the Snippet component is copyable or not
   * @default true
   */
  copyable?: boolean
  /**
   * @description The language of the content inside the Snippet component
   * @default 'tsx'
   */
  language?: string
  /**
   * @description Whether add spotlight background
   * @default false
   */
  spotlight?: boolean
  /**
   * @description The symbol to be displayed before the content inside the Snippet component
   */
  symbol?: string
  /**
   * @description The type of the Snippet component
   * @default 'ghost'
   */
  type?: 'ghost' | 'block'
}

const Snippet = memo<SnippetProps>(
  ({
    symbol,
    language = 'tsx',
    children,
    copyable = true,
    type = 'ghost',
    spotlight,
    ...rest
  }) => {
    const tirmedChildren = children.trim()
    return (
      <div {...rest} className={'inline-code flex items-center gap-2'}>
        <SyntaxHighlighter language={language}>
          {[symbol, tirmedChildren].filter(Boolean).join(' ')}
        </SyntaxHighlighter>
      </div>
    )
  }
)

export default Snippet
