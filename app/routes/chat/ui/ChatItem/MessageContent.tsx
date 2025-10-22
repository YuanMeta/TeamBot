import { type ReactNode } from 'react'
import { observer } from 'mobx-react-lite'
import Markdown from '~/components/project/markdown/markdown'
import BubblesLoading from './BubbleLoading'
import type { MessageData } from '../../store/store'
import { Reasoning } from './Reasion'

export interface MessageContentProps {
  fontSize?: number
  message?: ReactNode
  reasoning?: string
  duration?: number
}

const MessageContent = observer<{ msg: MessageData }>(({ msg }) => {
  if (msg.content === '...' && !msg.reasoning) return <BubblesLoading />
  return (
    <div className={'relative max-w-full'}>
      <div className={'flex flex-col gap-0.5'}>
        {!!msg.reasoning && (
          <Reasoning
            content={msg.reasoning}
            duration={msg.reasoningDuration}
            thinking={!!msg.reasoning && !msg.reasoningDuration && !msg.content}
          />
        )}
        {msg.content !== '...' && (
          <Markdown fontSize={16} fullFeaturedCodeBlock={true} variant={'chat'}>
            {msg.content!}
          </Markdown>
        )}
      </div>
    </div>
  )
})

export default MessageContent
