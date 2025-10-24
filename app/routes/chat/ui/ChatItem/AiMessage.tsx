import { useCallback, useEffect, useRef } from 'react'
import MessageContent from './MessageContent'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { AlertCircleIcon, Check, Clipboard, RotateCcw } from 'lucide-react'

import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { runInAction } from 'mobx'
import type { Message } from '@prisma/client'
import { useStore, type MessageData } from '../../store/store'
import { copyToClipboard } from '~/.client/copy'
import { markdownToPureHtml } from '~/lib/mdToHtml'
import { useLocalState } from '~/hooks/localState'
import type { MessagePart } from '~/types'
import { Button } from '~/components/ui/button'
dayjs.extend(relativeTime)

export const AiMessage = observer<{ msg: MessageData }>(({ msg }) => {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const store = useStore()
  const [state, setState] = useLocalState({
    copied: false,
    isEditing: false
  })

  const copy = useCallback(async () => {
    setState({ copied: true })
    const parts = msg.parts as MessagePart[]
    let content = parts
      ?.slice()
      .reverse()
      .find((s: MessagePart) => s.type === 'text')
    if (content) {
      copyToClipboard({
        html: await markdownToPureHtml(content),
        text: content
      })
    }
    setTimeout(() => {
      setState({ copied: false })
    }, 1000)
  }, [])
  useEffect(() => {
    // const dom = ref.current
    // if (dom && msg.content && !msg.height && (msg.error || msg.usage)) {
    //   const content = dom.children[0] as HTMLElement
    //   setTimeout(() => {
    //     // store.rpc.updateMessage(msg.id, {
    //     //   height: content.offsetHeight + 12
    //     // })
    //     runInAction(() => {
    //       msg.height = content.offsetHeight + 8
    //     })
    //   }, 100)
    // }
  }, [msg.error])
  return (
    <div
      className={'px-1 pt-3 ai-message w-full'}
      data-msg-id={msg.id}
      ref={ref}
      style={{
        containIntrinsicHeight: msg.height ?? undefined,
        contentVisibility: 'auto'
      }}
    >
      <div className={'flex w-full ai-message-content group'}>
        <div className='flex-1 relative w-0'>
          {msg.error ? (
            <Alert variant='destructive'>
              <AlertCircleIcon />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                <p className={'break-all'}>{msg.error}</p>
              </AlertDescription>
            </Alert>
          ) : (
            <MessageContent msg={msg} />
          )}
          {!!msg.terminated && (
            <div
              className={'dark:text-gray-300 italic text-sm mt-2 text-gray-400'}
            >
              已手动终止对话。
            </div>
          )}
          <div
            className={`flex items-center dark:text-white/60 text-neutral-500 text-[13px] ai-msg-actions h-8 pb-1 mt-2 gap-2`}
          >
            <div className={'flex space-x-0.5 *:cursor-pointer'}>
              <Button size={'icon-sm'} variant={'ghost'}>
                <RotateCcw />
              </Button>
              <Button size={'icon-sm'} variant={'ghost'} onClick={copy}>
                {state.copied ? <Check /> : <Clipboard />}
              </Button>
            </div>
            <div>
              {msg.model}{' '}
              <span className={'ml-2'}>{dayjs(msg.updatedAt).fromNow()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
