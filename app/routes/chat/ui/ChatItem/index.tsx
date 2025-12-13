import { UserMessage } from './UserMessage'
import { AiMessage } from './AiMessage'
import { observer } from 'mobx-react-lite'
import type { MessageData } from '../../store/store'
import type { MessageContext } from 'server/db/type'

const ChatItem = observer<{
  msg: MessageData
  preview?: boolean
  index: number
  context?: MessageContext
}>(({ msg, preview = false, index }) => {
  if (msg.role === 'user') {
    return <UserMessage msg={msg} preview={preview} index={index} />
  }
  if (msg.role === 'assistant') {
    return <AiMessage msg={msg} preview={preview} index={index} />
  }
})

export default ChatItem
