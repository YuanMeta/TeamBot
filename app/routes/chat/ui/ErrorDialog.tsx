import type { TRPC_ERROR_CODE_KEY } from '@trpc/server'
import { observer } from 'mobx-react-lite'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '~/components/ui/alert-dialog'
import { useLocalState, useSubject } from '~/hooks/localState'
import { useStore } from '../store/store'

export const ErrorDialog = observer(() => {
  const store = useStore()
  const [state, setState] = useLocalState({
    open: false,
    status: 'FORBIDDEN' as TRPC_ERROR_CODE_KEY,
    meta: null as null | { num: number; time: 'day' | 'week' | 'month' }
  })
  useSubject(store.errorDialog$, (data) => {
    setState({ open: true, status: data.status, meta: data.meta })
  })
  return (
    <AlertDialog open={state.open} onOpenChange={(e) => setState({ open: e })}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>提示</AlertDialogTitle>
          <AlertDialogDescription>
            {state.status === 'FORBIDDEN' && (
              <span>
                该助手不可访问，可能因管理员更改了配置，请重载页面后重试。
              </span>
            )}
            {state.status === 'NOT_FOUND' && (
              <span>该助手或模型可能已被移除，请重载页面后重试。</span>
            )}
            {state.status === 'TOO_MANY_REQUESTS' && (
              <span>
                您已达到该助手的请求上限，{state.meta?.num}次/每
                {state.meta?.time === 'day'
                  ? '天'
                  : state.meta?.time === 'week'
                  ? '周'
                  : '月'}
                。
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {state.status === 'TOO_MANY_REQUESTS' && (
            <AlertDialogCancel>确定</AlertDialogCancel>
          )}
          {state.status !== 'TOO_MANY_REQUESTS' && (
            <AlertDialogAction
              onClick={() => {
                window.location.reload()
              }}
            >
              好的，重载页面
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
})
