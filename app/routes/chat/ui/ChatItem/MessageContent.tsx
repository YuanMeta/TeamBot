import { useMemo, type ReactNode } from 'react'
import { observer } from 'mobx-react-lite'
import Markdown from '~/components/project/markdown/markdown'
import BubblesLoading from './BubbleLoading'
import { useStore, type MessageData } from '../../store/store'
import { Reasoning } from './Reasion'
import { HttpTool, UrlTool, WebSearchInfo, WebSearchTool } from './Tools'
import { formatStreamText } from '~/lib/chat'
import type { MessageContext } from 'server/db/type'

export interface MessageContentProps {
  fontSize?: number
  message?: ReactNode
  reasoning?: string
  duration?: number
}
const MessageContent = observer<{
  msg: MessageData
  context?: MessageContext | null
}>(({ msg, context }) => {
  const store = useStore()
  if (!msg.parts?.length && !msg.terminated) {
    return (
      <div className={`relative max-w-full`}>
        <div className={'flex flex-col gap-2.5'}>
          {!!context?.searchResult && (
            <WebSearchInfo result={context?.searchResult} />
          )}
          {(!context?.searchResult ||
            !!context.searchResult.results?.length) && <BubblesLoading />}
        </div>
      </div>
    )
  }
  return (
    <div className={`relative max-w-full`}>
      <div className={'flex flex-col gap-3'}>
        {!!context?.searchResult && (
          <WebSearchInfo result={context?.searchResult} />
        )}
        {msg.parts?.map((p, index) => (
          <div
            key={index}
            className={`${
              (msg.terminated &&
                p.type === 'tool' &&
                p.state !== 'completed') ||
              (p.type === 'text' && /^[\s\n]*$/.test(p.text || ''))
                ? 'hidden'
                : ''
            }`}
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
              !(p.state !== 'completed' && msg.terminated) && (
                <div>
                  {p.toolName === 'fetch_url_content' && <UrlTool tool={p} />}
                  {p.toolName === 'web_search' && (
                    <WebSearchTool
                      tool={p}
                      originData={msg.context?.toolCallOriginData || {}}
                    />
                  )}
                  {store.state.toolsMap.get(p.toolName)?.type === 'http' && (
                    <HttpTool tool={p} />
                  )}
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
