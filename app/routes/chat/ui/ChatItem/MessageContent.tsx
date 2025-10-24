import { Fragment, type ReactNode } from 'react'
import { observer } from 'mobx-react-lite'
import Markdown from '~/components/project/markdown/markdown'
import BubblesLoading from './BubbleLoading'
import type { MessageData } from '../../store/store'
import { Reasoning } from './Reasion'
import { Badge } from '~/components/ui/badge'
import { Check, X } from 'lucide-react'
import { UrlTool } from './Tools'

export interface MessageContentProps {
  fontSize?: number
  message?: ReactNode
  reasoning?: string
  duration?: number
}

const getDomain = (url: string) => {
  return new URL(url).host
}

const MessageContent = observer<{ msg: MessageData }>(({ msg }) => {
  if (!msg.parts?.length) return <BubblesLoading />
  return (
    <div className={'relative max-w-full'}>
      <div className={'flex flex-col gap-1.5'}>
        {msg.parts.map((p, index) => (
          <div key={index} className={'space-y-2'}>
            {p.type === 'text' && (
              <Markdown
                fontSize={16}
                fullFeaturedCodeBlock={true}
                variant={'chat'}
              >
                {p.text}
              </Markdown>
            )}
            {p.type === 'tool' && (
              <div>
                {p.toolName === 'getUrlContent' && <UrlTool tool={p} />}
              </div>
            )}
            {p.type === 'reasoning' && (
              <Reasoning
                content={p.reasoning}
                duration={msg.reasoningDuration}
                thinking={!p.completed}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
})

export default MessageContent
