import { Check, X } from 'lucide-react'
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
    return <div className='shine-text'>正在获取url内容...</div>
  }
  return (
    <Badge variant={'secondary'}>
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
