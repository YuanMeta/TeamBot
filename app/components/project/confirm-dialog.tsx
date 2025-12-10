import { observer } from 'mobx-react-lite'
import { Subject } from 'rxjs'
import { useSubject } from '~/hooks/localState'
import { Modal } from 'antd'
import type { ModalFunc } from 'antd/es/modal/confirm'
export const adminConfirmDialog$ = new Subject<Parameters<ModalFunc>[0]>()
export const AdminConfirmDialog = observer(() => {
  const [modalApi, context] = Modal.useModal()
  useSubject(adminConfirmDialog$, (value) => {
    modalApi.confirm(value)
  })
  return context
})
