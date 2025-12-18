import { memo, type ReactNode } from 'react'
import { Check, ChevronDown, Copy } from 'lucide-react'
import SyntaxHighlighter from './SyntaxHighlighter'
import { copyToClipboard } from '~/.client/copy'
import { observer } from 'mobx-react-lite'
import { useLocalState } from '~/hooks/localState'
import { Button } from '~/components/ui/button'
export interface HighlighterProps {
  actionsRender?: (props: {
    content: string
    language: string
    originalNode: ReactNode
  }) => ReactNode
  /**
   * @description The code content to be highlighted
   */
  children: string
  /**
   * @description Whether to expand code blocks by default
   * @default true
   */
  defalutExpand?: boolean
  enableTransformer?: boolean
  fileName?: string
  fullFeatured?: boolean
  /**
   * @description The language of the code content
   */
  language: string
  /**
   * @description Whether to show language tag
   * @default true
   */
  /**
   * @description The type of the code block
   * @default 'block'
   */
  type?: 'ghost' | 'block' | 'pure'
  wrap?: boolean
}

export const Highlighter = observer<HighlighterProps>(
  ({
    children,
    language = 'markdown',
    type = 'block',
    fileName,
    fullFeatured,
    actionsRender,
    defalutExpand,
    enableTransformer,
    wrap,
    ...rest
  }) => {
    const tirmedChildren = children.trim()

    const [state, setState] = useLocalState({
      copied: false
    })

    return (
      <div
        className={
          'relative overflow-hidden rounded-md border border-gray-200/60 dark:border-white/5 my-4 block-code'
        }
        {...rest}
      >
        <div
          className={
            'justify-between flex items-center h-9 pl-4 pr-1 absolute left-0 top-0 w-full'
          }
        >
          <div
            className={'leading-normal text-secondary-foreground/70 text-sm'}
          >
            {language}
          </div>
          <Button
            size={'icon-sm'}
            variant={'ghost'}
            className={'text-secondary-foreground/70'}
            onClick={() => {
              copyToClipboard(tirmedChildren)
              setState({ copied: true })
              setTimeout(() => {
                setState({ copied: false })
              }, 1000)
            }}
          >
            {!state.copied ? <Copy size={14} /> : <Check size={14} />}
            {/* <span>复制</span> */}
          </Button>
        </div>
        <div>
          <SyntaxHighlighter language={language?.toLowerCase()}>
            {tirmedChildren}
          </SyntaxHighlighter>
        </div>
      </div>
    )
  }
)

export default Highlighter
