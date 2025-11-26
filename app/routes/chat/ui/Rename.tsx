import { PencilLine } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { useLocalState, useSubject } from '~/hooks/localState'
import { useStore } from '../store/store'
import { trpc } from '~/.client/trpc'

export const ChatRename = observer(() => {
  const store = useStore()
  const [state, setState] = useLocalState({
    open: false,
    title: '',
    chat: null as null | (typeof store.state.chats)[number]
  })
  useSubject(store.renameChatTitle$, (chat) => {
    setState({ open: true, title: chat.title || '', chat })
  })
  return (
    <Dialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) {
          setState({ open: false })
        }
      }}
    >
      <DialogContent className={'w-[360px]'}>
        <DialogHeader>
          <DialogTitle>重命名对话</DialogTitle>
        </DialogHeader>
        <div className={'p-4'}>
          <Input
            placeholder={'输入对话标题'}
            value={state.title}
            onChange={(e) => setState({ title: e.target.value })}
          />
          <Button
            className={'w-full mt-5'}
            disabled={!state.title}
            onClick={() => {
              if (state.chat) {
                trpc.chat.updateChat.mutate({
                  id: state.chat.id,
                  data: {
                    title: state.title
                  }
                })
                store.setState(() => {
                  state.chat!.title = state.title
                })
                setState({ open: false, chat: null })
              }
            }}
          >
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
})
