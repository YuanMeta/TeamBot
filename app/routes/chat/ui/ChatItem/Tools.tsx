import {
  Check,
  ChevronRight,
  FileSearch2,
  GitBranchPlus,
  Link,
  Recycle,
  Search,
  X
} from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { Badge } from '~/components/ui/badge'
import { getDomain } from '~/lib/utils'
import type { ToolPart } from '~/types'
import { useStore } from '../../store/store'
import type { MessageContext } from '~/.server/db/type'
import { useMemo } from 'react'

export const OtherTools = observer(({ tool }: { tool: ToolPart }) => {
  const className = useMemo(() => {
    if (tool.state === 'completed') return ''
    if (tool.state === 'error') return 'text-red-600/80 dark:text-red-500/80'
    return 'shine-text'
  }, [tool.state])
  return (
    <Badge
      variant={'secondary'}
      className={`text-sm cursor-default ${className}`}
    >
      <Recycle />
      <span>{tool.toolName}</span>
    </Badge>
  )
})

export const UrlTool = observer(({ tool }: { tool: ToolPart }) => {
  const className = useMemo(() => {
    if (tool.state === 'completed') return ''
    if (tool.state === 'error') return 'text-red-600/80 dark:text-red-500/80'
    return 'shine-text'
  }, [tool.state])
  return (
    <Badge
      variant={'secondary'}
      onClick={() => {
        window.open(tool.input.url)
      }}
      className={`text-sm cursor-pointer ${className}`}
    >
      <Link />
      <span>
        {tool.state === 'start'
          ? '正在获取链接内容...'
          : getDomain(tool.input?.url || '')}
      </span>
    </Badge>
  )
})

// export const UrlTool = observer(({ tool }: { tool: ToolPart }) => {
//   if (tool.state === 'start') {
//     return (
//       <Badge className='flex items-center gap-1 text-sm' variant={'secondary'}>
//         <FileSearch2
//           className={'size-4 text-neutral-500 dark:text-neutral-400'}
//         />
//         <span className={'shine-text'}>正在获取链接内容...</span>
//       </Badge>
//     )
//   }
//   return (
//     <Badge
//       variant={'secondary'}
//       className={'cursor-pointer text-sm'}
//       onClick={() => {
//         window.open(tool.input.url)
//       }}
//     >
//       {tool.state === 'completed' ? (
//         <Check className={'text-emerald-600'} />
//       ) : (
//         <X className={'text-red-600'} />
//       )}
//       <span className={'max-w-[300px] truncate'}>
//         {getDomain(tool.input?.url || '')}
//       </span>
//     </Badge>
//   )
// })

export const WebSearchInfo = observer(
  ({ result }: { result: MessageContext['searchResult'] }) => {
    const store = useStore()
    return (
      <div
        className={
          'cursor-pointer text flex items-center justify-between border rounded-md px-2 h-9 hover:bg-neutral-50 duration-150 dark:hover:bg-neutral-400/10'
        }
        onClick={() => {
          if (result?.results?.length) {
            store.setState((draft) => {
              draft.selectSearchResult = result.results!
            })
          }
        }}
      >
        <div
          className={
            'flex items-center gap-2 flex-1 text-sm text-secondary-foreground/80'
          }
        >
          <Search className={'size-4 text-neutral-500 dark:text-neutral-400'} />
          <span
            className={`flex gap-2 flex-1 ${
              result?.error ? 'text-red-600/80 dark:text-red-500/80' : ''
            } ${!result?.error && !result?.results ? 'shine-text' : ''}`}
          >
            <span>
              {result?.error
                ? `搜索异常`
                : result?.results?.length
                ? '搜索'
                : '正在搜索'}
              :
            </span>
            <span
              className={'truncate flex-1 w-0'}
              title={result?.error || result?.query}
            >
              {result?.error || result?.query}
            </span>
          </span>
        </div>
        <div
          className={
            'flex items-center gap-1 text-secondary-foreground/60 shrink-0 ml-10'
          }
        >
          {!!result?.results?.length && (
            <>
              <span className={'text-sm'}>{result.results.length}个结果</span>
              <ChevronRight className={'size-4'} />
            </>
          )}
        </div>
      </div>
    )
  }
)
export const WebSearchTool = observer(
  ({
    tool,
    originData
  }: {
    tool: ToolPart
    originData: Record<string, any>
  }) => {
    const store = useStore()
    if (!tool.input?.query) return null
    const output = originData[tool.toolCallId] || tool.output
    return (
      <div
        className={
          'cursor-pointer text flex items-center justify-between border rounded-md px-2 h-9 hover:bg-neutral-50 duration-150 dark:hover:bg-neutral-400/10'
        }
        onClick={() => {
          if (output instanceof Array) {
            store.setState((draft) => {
              draft.selectSearchResult = output
            })
          }
        }}
      >
        <div
          className={
            'flex items-center gap-2 flex-1 text-sm text-secondary-foreground/80'
          }
        >
          <Search className={'size-4 text-neutral-500 dark:text-neutral-400'} />
          <span
            className={`flex gap-2 flex-1 ${
              tool.errorText ? 'text-red-600/80 dark:text-red-500/80' : ''
            } ${
              !tool.errorText && tool.state !== 'completed' ? 'shine-text' : ''
            }`}
          >
            <span>
              {tool.errorText
                ? '搜索异常'
                : tool.state === 'completed'
                ? '搜索'
                : '正在搜索'}
              :
            </span>
            <span
              className={'truncate flex-1 w-0'}
              title={
                tool?.errorText ||
                tool.input?.query ||
                tool.output?.action?.query ||
                '已搜索相关内容'
              }
            >
              {tool?.errorText ||
                tool.input?.query ||
                tool.output?.action?.query ||
                '已搜索相关内容'}
            </span>
          </span>
        </div>
        <div
          className={
            'flex items-center gap-1 text-secondary-foreground/60 shrink-0 ml-10'
          }
        >
          {output instanceof Array && (
            <>
              <span className={'text-sm'}>{output?.length}个结果</span>
              <ChevronRight className={'size-4'} />
            </>
          )}
        </div>
      </div>
    )
  }
)

export const HttpTool = observer(({ tool }: { tool: ToolPart }) => {
  const store = useStore()
  if (tool.state === 'start') {
    return (
      <div className='flex items-center gap-1'>
        <Search className={'size-4 text-neutral-500 dark:text-neutral-400'} />
        <span className={'shine-text'}>
          {store.state.toolsMap.get(tool.toolName)?.name}...
        </span>
      </div>
    )
  }
  if (tool.errorText) {
    return (
      <Badge variant={'destructive'} className={'text-sm'}>
        <GitBranchPlus />
        {tool.errorText}
      </Badge>
    )
  }
  return (
    <Badge
      variant={'secondary'}
      className={'text-sm cursor-default'}
      onClick={() => {
        if (tool.output instanceof Array) {
          store.setState((draft) => {
            draft.selectSearchResult = tool.output
          })
        }
      }}
    >
      <GitBranchPlus />
      <span>
        {store.state.toolsMap.get(tool.toolName)?.name || tool.toolName}
      </span>
    </Badge>
  )
})
