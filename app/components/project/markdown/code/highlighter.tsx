import { memo, type ReactNode } from 'react'
import { Check, ChevronDown, Copy } from 'lucide-react'
import SyntaxHighlighter from './SyntaxHighlighter'
import { copyToClipboard } from '~/.client/copy'
import { observer } from 'mobx-react-lite'
import { useLocalState } from '~/hooks/localState'
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
      copied: false,
      expand: true
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
            'justify-between flex items-center h-8 dark:bg-gray-700/5 px-2 bg-gray-50'
          }
        >
          <div
            className={
              'p-1 rounded-sm hover:bg-black/10 duration-200 cursor-pointer dark:hover:bg-white/10 select-none'
            }
            onClick={() => setState({ expand: !state.expand })}
          >
            <ChevronDown
              className={`duration-200 stroke-gray-500 dark:stroke-gray-400 ${!state.expand ? '-rotate-90' : ''}`}
              size={16}
            />
          </div>
          <div className={'leading-normal'}>{language}</div>
          <div
            className={
              'p-1 rounded-sm hover:bg-black/10 duration-200 cursor-pointer dark:hover:bg-white/10 select-none'
            }
            onClick={() => {
              copyToClipboard(tirmedChildren)
              setState({ copied: true })
              setTimeout(() => {
                setState({ copied: false })
              }, 1000)
            }}
          >
            {!state.copied ? (
              <Copy
                className={`duration-200 stroke-gray-500 dark:stroke-gray-400`}
                size={14}
              />
            ) : (
              <Check
                className={`duration-200 stroke-gray-500 dark:stroke-gray-400`}
                size={14}
              />
            )}
          </div>
        </div>
        <div style={state.expand ? {} : { height: 0, overflow: 'hidden' }}>
          <SyntaxHighlighter language={language?.toLowerCase()}>
            {tirmedChildren}
          </SyntaxHighlighter>
        </div>
      </div>
    )
  }
)

export default Highlighter
