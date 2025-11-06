import {
  Check,
  ChevronRight,
  Earth,
  FileSearch2,
  GitBranchPlus,
  Search,
  Wrench,
  X
} from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { Badge } from '~/components/ui/badge'
import { getDomain } from '~/lib/utils'
import type { ToolPart } from 'types'
import { useStore } from '../../store/store'
import { TextHelp } from '~/components/project/text-help'

export const UrlTool = observer(({ tool }: { tool: ToolPart }) => {
  if (tool.state === 'start') {
    return (
      <div className='flex items-center gap-1'>
        <FileSearch2
          className={'size-4 text-neutral-500 dark:text-neutral-400'}
        />
        <span className={'shine-text'}>正在获取链接内容...</span>
      </div>
    )
  }
  return (
    <Badge
      variant={'secondary'}
      className={'cursor-pointer text-sm'}
      onClick={() => {
        window.open(tool.input.url)
      }}
    >
      {tool.state === 'completed' ? (
        <Check className={'text-emerald-600'} />
      ) : (
        <X className={'text-red-600'} />
      )}
      <span className={'max-w-[300px] truncate'}>
        {getDomain(tool.input?.url || '')}
      </span>
    </Badge>
  )
})

export const WebSearchTool = observer(({ tool }: { tool: ToolPart }) => {
  const store = useStore()
  if (!tool.input?.query) return null
  if (tool.state === 'start') {
    return (
      <div className='flex items-center gap-1'>
        <Search className={'size-4 text-neutral-500 dark:text-neutral-400'} />
        <span className={'shine-text'}>{tool.input?.query}...</span>
      </div>
    )
  }
  if (tool.errorText) {
    return (
      <TextHelp text={tool.input?.query} delay={1000}>
        <Badge variant={'destructive'} className={'text-sm'}>
          <Earth />
          {tool.errorText}
        </Badge>
      </TextHelp>
    )
  }
  return (
    <TextHelp text={tool.input?.query} delay={1000}>
      <Badge
        variant={'secondary'}
        className={'cursor-pointer text-sm'}
        onClick={() => {
          if (tool.output instanceof Array) {
            store.setState((draft) => {
              draft.selectSearchResult = tool.output
            })
          }
        }}
      >
        <Earth />
        {tool.output instanceof Array ? (
          <>
            <span>{tool.output?.length}个网页</span>
            <ChevronRight className={'size-7'} strokeWidth={3} />
          </>
        ) : (
          <span>{tool.output as string}</span>
        )}
      </Badge>
    </TextHelp>
  )
})

export const HttpTool = observer(({ tool }: { tool: ToolPart }) => {
  const store = useStore()
  if (tool.state === 'start') {
    return (
      <div className='flex items-center gap-1'>
        <Search className={'size-4 text-neutral-500 dark:text-neutral-400'} />
        <span className={'shine-text'}>
          {store.toolsMap.get(tool.toolName)?.name}...
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
      <span>{store.toolsMap.get(tool.toolName)?.name || tool.toolName}</span>
    </Badge>
  )
})
