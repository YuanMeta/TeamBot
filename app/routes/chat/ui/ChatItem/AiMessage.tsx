import { useCallback, useEffect, useRef } from 'react'
import MessageContent from './MessageContent'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { AlertCircleIcon, Check, Clipboard, RotateCcw } from 'lucide-react'
import { useGetSetState } from 'react-use'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { runInAction } from 'mobx'
import type { Message } from '@prisma/client'
import { useStore, type MessageData } from '../../store/store'
import { copyToClipboard } from '~/.client/copy'
import { markdownToPureHtml } from '~/lib/mdToHtml'

dayjs.extend(relativeTime)

export const AiMessage = observer<{ msg: MessageData }>(({ msg }) => {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const store = useStore()
  const [state, setState] = useGetSetState({
    copied: false,
    isEditing: false
  })

  const copy = useCallback(async () => {
    setState({ copied: true })
    if (msg.content) {
      copyToClipboard({
        html: await markdownToPureHtml(msg.content),
        text: msg.content
      })
    }

    setTimeout(() => {
      setState({ copied: false })
    }, 1000)
  }, [msg.content])
  useEffect(() => {
    const dom = ref.current
    if (dom && msg.content && !msg.height && (msg.error || msg.usage)) {
      const content = dom.children[0] as HTMLElement
      setTimeout(() => {
        // store.rpc.updateMessage(msg.id, {
        //   height: content.offsetHeight + 12
        // })
        runInAction(() => {
          msg.height = dom.offsetHeight
        })
      }, 100)
    }
  }, [msg.usage, msg.error])
  return (
    <div
      className={'px-1 pt-2 ai-message w-full'}
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
              className={'dark:text-gray-300 italic text-sm mt-1 text-gray-400'}
            >
              {t('chat.message.systemStopped')}
            </div>
          )}
          <div
            className={`flex items-center dark:text-white/50 text-gray-500 text-[13px] ai-msg-actions h-8 pb-1 mt-2 gap-2`}
          >
            <div
              className={
                'flex space-x-0.5 *:cursor-pointer *:w-6 *:h-6 *:flex *:items-center *:justify-center *:rounded-full'
              }
            >
              <div className={'msg-action'}>
                <RotateCcw size={14} />
              </div>
              <div className={'msg-action'} onClick={copy}>
                {state().copied ? <Check size={14} /> : <Clipboard size={14} />}
              </div>
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
