import { type ReactNode } from 'react'
import { Flexbox } from 'react-layout-kit'
import { observer } from 'mobx-react-lite'
import Markdown from '@/components/markdown/Markdown'
import BubblesLoading from '../message/BubbleLoading'
import type { Message } from '@/types/table'
import { Reasoning } from '../message/Reasion'

export interface MessageContentProps {
  fontSize?: number
  message?: ReactNode
  reasoning?: string
  duration?: number
}

const MessageContent = observer<{ msg: Message }>(({ msg }) => {
  if (msg.content === '...' && !msg.reasoning) return <BubblesLoading />
  return (
    <Flexbox className={'relative max-w-full'}>
      <div className={'flex flex-col gap-0.5'}>
        {!!msg.reasoning && (
          <Reasoning
            content={msg.reasoning}
            duration={msg.duration}
            thinking={!!msg.reasoning && !msg.duration}
          />
        )}
        {msg.content !== '...' && (
          <Markdown fontSize={16} fullFeaturedCodeBlock={true} variant={'chat'}>
            {msg.content}
          </Markdown>
        )}
      </div>
    </Flexbox>
  )
})

export default MessageContent
