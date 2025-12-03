import isHotkey from 'is-hotkey'
import { Check, Clipboard, Copy, Pencil } from 'lucide-react'
import { useCallback, useRef } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore, type MessageData } from '../../store/store'
import { useTheme } from 'remix-themes'
import { copyToClipboard } from '~/.client/copy'
import { Textarea } from '~/components/ui/textarea'
import { Button } from '~/components/ui/button'
import { useLocalState } from '~/hooks/localState'
import { Badge } from '~/components/ui/badge'
const fileTypeIconMap = [
  [/\.pdf$/i, 'pdf', '#F54838'],
  [/\.docx$/i, 'doc', '#0078D4'],
  [/\.xls$/i, 'xls', '#10b981'],
  [/\.xls$/i, 'csv', '#10b981'],
  [/\.xlsx$/i, 'xlsx', '#10b981'],
  [/\.md$/i, 'md', '#f59e0b']
] as [RegExp, string, string][]

export const UserMessage = observer<{
  msg: MessageData
  preview?: boolean
  index: number
}>(({ msg, preview = false, index }) => {
  const [theme] = useTheme()
  const store = useStore()
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useLocalState({
    copied: false,
    inputText: msg.text || '',
    isEditing: false
  })
  const getFileTypeIcon = useCallback(
    (fileName: string) => {
      const fileType = fileTypeIconMap.find(([regex]) => regex.test(fileName))
      return fileType
        ? [fileType[1], fileType[2]]
        : [
            fileName.split('.').pop()?.toLocaleLowerCase() || 'file',
            theme === 'dark' ? '#fff' : '#000'
          ]
    },
    [theme]
  )

  const startEditing = useCallback(() => {
    setState({ isEditing: true })
    setTimeout(() => {
      const textarea = document.getElementById(
        `msg-${msg.id}`
      ) as HTMLTextAreaElement
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(textarea.value.length, textarea.value.length)
      }
    }, 30)
  }, [])

  const copy = useCallback(() => {
    copyToClipboard({ text: msg.text || '' })
    setState({ copied: true })
    setTimeout(() => {
      setState({ copied: false })
    }, 1000)
  }, [])

  const update = useCallback(() => {
    if (state.inputText) {
      setState({ isEditing: false })
      store.client.regenerate(index + 1, state.inputText)
    }
  }, [state])
  const hotKey = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isHotkey('escape', e)) {
      setState({
        isEditing: false,
        inputText: msg.text || ''
      })
    }
  }, [])
  return (
    <div
      className={'py-3 pl-10 flex flex-col items-end user-message'}
      ref={ref}
    >
      {state.isEditing && (
        <div className={'w-[80%]'}>
          <Textarea
            value={state.inputText}
            id={`msg-${msg.id}`}
            onKeyDown={hotKey}
            className={'resize-none'}
            rows={4}
            onChange={(e) => {
              setState({ inputText: e.target.value })
            }}
          />
          <div className={'flex justify-end mt-2 space-x-2'}>
            <Button
              variant={'outline'}
              size={'sm'}
              onClick={() => {
                setState({
                  isEditing: false,
                  inputText: msg.text || ''
                })
              }}
            >
              取消
            </Button>
            <Button onClick={update} size={'sm'}>
              更新
            </Button>
          </div>
        </div>
      )}
      {!state.isEditing && (
        <div className={'flex w-full justify-end group'}>
          <div
            className={
              'flex mr-2 pt-1 gap-1 *:cursor-pointer duration-150 opacity-0 group-hover:opacity-100 dark:text-white/60 text-neutral-500'
            }
          >
            <Button size={'icon-sm'} variant={'ghost'} onClick={copy}>
              {state.copied ? <Check /> : <Clipboard />}
            </Button>
            {!preview && (
              <Button size={'icon-sm'} variant={'ghost'} onClick={startEditing}>
                <Pencil />
              </Button>
            )}
          </div>
          <div className={'chat-user-message px-4 py-2 max-w-[80%] leading-5'}>
            <div>{msg.text}</div>
          </div>
        </div>
      )}
      {/* {!!msg.context?.length && (
        <Dropdown
          menu={{
            onClick: (e) => {
              store.note.openDocById(e.key)
            },
            items: msg.context.map((c) => {
              return {
                icon: <File size={13} />,
                key: c.id,
                label: c.name
              }
            })
          }}
        >
          <div className={'mt-1.5 space-x-2 flex justify-end flex-wrap'}>
            <div
              className={
                'max-w-[300px] cursor-pointer flex items-center truncate rounded-sm bg-black/10 dark:bg-white/10 text-[13px] px-1.5 py-0.5 mb-0.5'
              }
            >
              <Text size={15} />
              <span className={'truncate w-full ml-1'}>Context</span>
            </div>
          </div>
        </Dropdown>
      )} */}

      {!!msg.docs?.length && (
        <div className={'mt-1.5 space-x-2 flex justify-end flex-wrap'}>
          {msg.docs.map((f, i) => {
            return (
              <Badge
                key={i}
                title={f.name!}
                className={
                  'max-w-[200px] bg-sky-500/10 hover:bg-sky-500/10 dark:bg-sky-500/15 dark:hover:bg-sky-500/15'
                }
                variant={'secondary'}
              >
                <span className={'truncate w-full ml-1'}>
                  {f.name.split('.')[0]}
                </span>
                <span>.{f.name.split('.').pop()}</span>
              </Badge>
            )
          })}
        </div>
      )}
      {!!msg.files?.length && (
        <div className={'mt-2 space-x-2 flex justify-end flex-wrap'}>
          {msg.files.map((f, i) => {
            return (
              <div
                key={i}
                onClick={() => {
                  store.openPreviewImages$.next(
                    msg.files!.map((f) =>
                      typeof f === 'object'
                        ? URL.createObjectURL(f)
                        : `/files/${f}`
                    )
                  )
                }}
                className={
                  'w-36 h-auto flex items-center rounded-lg mb-0.5 overflow-hidden cursor-pointer max-h-96 shadow shadow-black/10 dark:shadow-black/50'
                }
              >
                <img
                  src={
                    typeof f === 'object'
                      ? URL.createObjectURL(f)
                      : `/files/${f}`
                  }
                  className={'w-full h-full object-cover'}
                  alt=''
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})
