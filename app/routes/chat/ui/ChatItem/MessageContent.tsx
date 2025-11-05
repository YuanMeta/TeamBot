import { type ReactNode } from 'react'
import { observer } from 'mobx-react-lite'
import Markdown from '~/components/project/markdown/markdown'
import BubblesLoading from './BubbleLoading'
import type { MessageData } from '../../store/store'
import { Reasoning } from './Reasion'
import { UrlTool, WebSearchTool } from './Tools'

export interface MessageContentProps {
  fontSize?: number
  message?: ReactNode
  reasoning?: string
  duration?: number
}
const MessageContent = observer<{ msg: MessageData }>(({ msg }) => {
  if (!msg.parts?.length && !msg.terminated) return <BubblesLoading />
  return (
    <div className={'relative max-w-full'}>
      <div className={'flex flex-col gap-2.5'}>
        {msg.parts?.map((p, index) => (
          <div key={index}>
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
                {p.toolName === 'get_url_content' && <UrlTool tool={p} />}
                {p.toolName.startsWith('web-') && <WebSearchTool tool={p} />}
              </div>
            )}

            {p.type === 'reasoning' && (!p.completed || !!p.reasoning) && (
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
