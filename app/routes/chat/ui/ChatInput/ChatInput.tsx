import { CircleStop, CircleX, SendHorizontal } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { useCallback } from 'react'
import { InputArea } from './InputArea'
import { useStore } from '../../store/store'
import { useLocalState } from '~/hooks/localState'
import { InputTools } from './InputTools'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { toast } from 'sonner'
export const ChatInput = observer(() => {
  const store = useStore()
  const [state, setState] = useLocalState({
    files: [] as File[],
    images: [] as File[],
    prompt: '',
    webSearch: false
  })
  const onSend = useCallback(async () => {
    if (!store.state.assistant?.id) {
      toast.error('管理员尚未创建助手。')
      return
    }
    if (!state.prompt || store.state.pending) return
    store.chat({
      text: state.prompt
    })
    setState({ prompt: '' })
    // let files: MessageFile[] = []
    // let images: MessageFile[] = []
    // for (let f of state.files) {
    //   files.push({ name: f.name, content: await fileToBase64(f), type: 'file' })
    // }
    // for (let f of state.images) {
    //   images.push({ name: f.name, content: await fileToBase64(f), type: 'image' })
    // }
    // store.completion(text, {
    //   files,
    //   images
    // })
  }, [])
  const onAddFile = useCallback((file: File) => {
    // setState((state) => {
    //   mediaType(file.name) === 'image'
    //     ? state.images.push(file)
    //     : state.files.push(file)
    // })
  }, [])
  return (
    <div className={'chat-input w-full relative px-8'}>
      <div
        className={`chat-input-content`}
        onClick={() => {
          document.querySelector<HTMLDivElement>('#chat-input')?.focus()
        }}
      >
        <div className={'overflow-y-auto h-0 flex-1 max-h-52'}>
          <div>
            {!!state.files.length && (
              <div className={'pb-2 flex items-center flex-wrap'}>
                {state.files.map((f, i) => (
                  <div
                    className={
                      'max-w-[200px] py-1 rounded-xl mr-2 mb-1 dark:bg-white/10 bg-black/10 pl-2 pr-1 relative group'
                    }
                    key={i}
                  >
                    <div className='flex items-center justify-between w-full'>
                      <span className={'text-sm truncate'} title={f.name}>
                        {f.name}
                      </span>

                      <span
                        className={
                          'px-2 py-1 bg-black/20 rounded-full text-xs scale-90 ml-1'
                        }
                      >
                        {f.name.split('.').pop()}
                      </span>
                      <div
                        className='absolute bg-black/50 rounded-lg text-white p-1 right-0.5 top-0.5  flex items-center group-hover:opacity-100 opacity-0'
                        onMouseDown={(e) => {
                          e.preventDefault()
                        }}
                        onClick={() => {
                          setState((state) => {
                            state.files.splice(i, 1)
                          })
                        }}
                      >
                        <CircleX size={14} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!!state.images.length && (
              <div className={'pb-2 space-x-2 flex flex-wrap'}>
                {state.images.map((item, i) => (
                  <div
                    key={i}
                    className={
                      'w-16 mb-0.5 h-16 rounded-xl overflow-hidden bg-white/10 flex items-center justify-between relative group flex-wrap group cursor-default'
                    }
                  >
                    <img
                      src={URL.createObjectURL(item)}
                      className={'w-full h-full object-cover'}
                      alt=''
                    />
                    <div
                      onClick={() => {
                        setState((state) => {
                          state.images.splice(i, 1)
                        })
                      }}
                      className={
                        'absolute p-1 right-1 top-0.5 bg-black/50 rounded-lg flex items-center justify-center group-hover:opacity-100 opacity-0 duration-150 stroke-white cursor-pointer'
                      }
                    >
                      <CircleX size={14} className={'stroke-inherit'} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <InputArea
              onSend={onSend}
              value={state.prompt}
              onChange={(text) => {
                setState({ prompt: text })
              }}
              onAddFile={onAddFile}
            />
          </div>
        </div>
        <div
          className={
            'flex items-center justify-between text-secondary-foreground/80 pt-2.5 gap-3'
          }
        >
          <div className={'flex gap-1.5 flex-1 w-0'}>
            <InputTools />
            {store.state.selectedTools[
              store.state.selectedChat?.id || 'default'
            ]?.length > 0 && (
              <div
                className={
                  'flex items-center gap-1.5 flex-1 w-0 flex-wrap pt-[3px]'
                }
              >
                {store.state.selectedTools[
                  store.state.selectedChat?.id || 'default'
                ].map((t) => (
                  <Badge
                    removeable={true}
                    variant={'outline'}
                    key={t}
                    onRemove={() => {
                      store.setState((draft) => {
                        draft.selectedTools[
                          draft.selectedChat?.id || 'default'
                        ] = draft.selectedTools[
                          draft.selectedChat?.id || 'default'
                        ]?.filter((id) => id !== t)
                      })
                    }}
                  >
                    {store.toolsMap.get(t)?.name || t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className={'flex items-center justify-between'}>
            <div className={'flex items-center gap-3'}>
              {store.state.pending ? (
                <Button
                  size={'icon-sm'}
                  variant={'ghost'}
                  onClick={(e) => {
                    e.stopPropagation()
                    store.stop(store.state.selectedChat?.id!)
                  }}
                >
                  <CircleStop size={18} />
                </Button>
              ) : (
                <Button
                  size={'icon-sm'}
                  variant={'ghost'}
                  onClick={(e) => {
                    e.stopPropagation()
                    setState({ prompt: '' })
                  }}
                >
                  <SendHorizontal size={18} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
