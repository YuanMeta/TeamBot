import { observer } from 'mobx-react-lite'
import { useRef } from 'react'
import { Subject } from 'rxjs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '~/components/ui/alert-dialog'
import { useLocalState, useSubject } from '~/hooks/localState'
import { Spinner } from '../ui/spinner'
import { CircleAlert } from 'lucide-react'
export const adminConfirmDialog$ = new Subject<{
  title: string
  description: string
  destructive?: boolean
  okText?: string
  cancelText?: string
  onConfirm?: () => Promise<any>
  onCancel?: () => void
}>()
export const AdminConfirmDialog = observer(() => {
  const handle = useRef<{
    onConfirm?: () => Promise<any>
    onCancel?: () => void
  }>({})
  const [state, setState] = useLocalState({
    open: false,
    destructive: false,
    title: '',
    loading: false,
    okText: '确定',
    cancelText: '取消',
    description: ''
  })
  useSubject(adminConfirmDialog$, (value) => {
    setState({
      open: true,
      title: value.title,
      destructive: value.destructive || false,
      description: value.description,
      okText: value.okText || '确定',
      cancelText: value.cancelText || '取消'
    })
    handle.current = {
      onConfirm: value.onConfirm,
      onCancel: value.onCancel
    }
  })
  return (
    <AlertDialog open={state.open} onOpenChange={(open) => setState({ open })}>
      <AlertDialogContent className={'w-96'}>
        <AlertDialogHeader>
          <AlertDialogTitle className={'flex items-center gap-2'}>
            <CircleAlert
              className={`size-5 ${state.destructive ? 'text-destructive' : 'text-primary'}`}
            />
            {state.title}
          </AlertDialogTitle>
          <AlertDialogDescription>{state.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handle.current?.onCancel}>
            {state.cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={state.loading}
            variant={state.destructive ? 'destructive' : undefined}
            onClick={async (e) => {
              setState({ loading: true })
              try {
                e.stopPropagation()
                e.preventDefault()
                await handle.current?.onConfirm?.()
                setState({ open: false })
              } finally {
                setTimeout(() => {
                  setState({ loading: false })
                }, 100)
              }
            }}
          >
            {state.loading && <Spinner />}
            {state.okText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
})
