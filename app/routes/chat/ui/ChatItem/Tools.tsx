import { Check, ChevronRight, FileSearch2, Link, Search, X } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { Badge } from '~/components/ui/badge'
import type { ToolPart } from '~/types'

const getDomain = (url: string) => {
  try {
    return new URL(url).host || url
  } catch (e) {
    return url
  }
}

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
  if (tool.state === 'start') {
    return (
      <div className='flex items-center gap-1'>
        <Search className={'size-4 text-neutral-500 dark:text-neutral-400'} />
        <span className={'shine-text'}>正在搜索相关内容...</span>
      </div>
    )
  }
  return (
    <Badge variant={'secondary'} className={'cursor-pointer text-sm'}>
      {tool.output?.length} 篇资料{' '}
      <ChevronRight className={'size-7'} strokeWidth={3} />
    </Badge>
  )
})
