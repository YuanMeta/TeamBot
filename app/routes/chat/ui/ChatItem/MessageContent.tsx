import { type ReactNode } from 'react'
import { observer } from 'mobx-react-lite'
import Markdown from '~/components/project/markdown/markdown'
import BubblesLoading from './BubbleLoading'
import { useStore, type MessageData } from '../../store/store'
import { Reasoning } from './Reasion'
import { HttpTool, UrlTool, WebSearchTool } from './Tools'
import { formatStreamText } from '~/lib/chat'
import type { ToolPart } from 'types'

export interface MessageContentProps {
  fontSize?: number
  message?: ReactNode
  reasoning?: string
  duration?: number
}
const MessageContent = observer<{ msg: MessageData }>(({ msg }) => {
  const store = useStore()
  if (!msg.parts?.length && !msg.terminated) return <BubblesLoading />
  return (
    <div className={'relative max-w-full'}>
      <div className={'flex flex-col gap-2.5'}>
        {msg.parts?.map((p, index) => (
          <div
            key={index}
            className={`${(p as ToolPart).state === 'completed' && store.toolsMap.get((p as ToolPart).toolName)?.type === 'http' ? 'hidden' : ''}`}
          >
            {p.type === 'text' && (
              <Markdown
                fontSize={16}
                fullFeaturedCodeBlock={true}
                variant={'chat'}
              >
                {formatStreamText(p.text)}
              </Markdown>
            )}
            {p.type === 'tool' &&
              (store.toolsMap.get(p.toolName) ||
                p.toolName === 'get_url_content') && (
                <div>
                  {p.toolName === 'get_url_content' && <UrlTool tool={p} />}
                  {(store.toolsMap.get(p.toolName)?.type === 'web_search' ||
                    p.toolName === 'web_search') && <WebSearchTool tool={p} />}
                  {store.toolsMap.get(p.toolName)?.type === 'http' &&
                    p.state !== 'completed' && <HttpTool tool={p} />}
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
