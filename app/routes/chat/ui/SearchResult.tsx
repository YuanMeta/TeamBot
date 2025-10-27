import { X } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { useStore } from '../store/store'
import dayjs from 'dayjs'
import { getDomain } from '~/lib/utils'
import { useLocalState } from '~/hooks/localState'
import { useCallback, useEffect } from 'react'

export const SearchResult = observer(() => {
  const store = useStore()
  const [state, setState] = useLocalState({
    open: false,
    show: false
  })
  useEffect(() => {
    if (store.state.selectSearchResult !== null) {
      setState({
        open: true
      })
      setTimeout(() => {
        setState({
          show: true
        })
      }, 30)
    }
  }, [store.state.selectSearchResult])
  const close = useCallback(() => {
    setState({
      show: false
    })
    setTimeout(() => {
      setState({ open: false })
      store.setState((draft) => {
        draft.selectSearchResult = null
      })
    }, 200)
  }, [])
  if (!state.open) return null
  return (
    <div
      className={`h-full ${state.show ? 'w-[400px]' : 'w-0'} flex flex-col border-l duration-150`}
    >
      <div className={'flex px-3 items-center h-13 border-b justify-between'}>
        <span>引用</span>
        <Button variant={'ghost'} size={'icon'} onClick={close}>
          <X />
        </Button>
      </div>
      <div
        className={`flex-1 h-0 px-2 py-2 pb-5 overflow-y-auto duration-400 ${state.show ? 'opacity-100' : 'opacity-0'}`}
      >
        {store.state.selectSearchResult?.map((s) => (
          <a
            href={s.url}
            target={'_blank'}
            className={
              'p-3 rounded-md space-y-1 hover:bg-accent cursor-default block'
            }
          >
            <div className={'flex items-center gap-2'}>
              {!!s.favicon && (
                <img alt='' className={'size-4 rounded-full'} src={s.favicon} />
              )}
              <span className={'text-sm'}>{getDomain(s.url)}</span>
              <Separator orientation={'vertical'} className={'h-4'} />
              {!!s.date && (
                <div className={'text-xs text-muted-foreground'}>
                  {dayjs(s.date).format('YYYY/MM/DD')}
                </div>
              )}
            </div>
            <div className={'font-medium text-sm line-clamp-2'}>{s.title}</div>
            <div className={'text-[13px] text-muted-foreground line-clamp-2'}>
              {s.summary}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
})
