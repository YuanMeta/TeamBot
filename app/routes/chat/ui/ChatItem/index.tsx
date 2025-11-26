import { UserMessage } from './UserMessage'
import { AiMessage } from './AiMessage'
import { observer } from 'mobx-react-lite'
import type { MessageData } from '../../store/store'

const ChatItem = observer<{
  msg: MessageData
  preview?: boolean
  index: number
}>(({ msg, preview = false, index }) => {
  if (msg.role === 'user') {
    return <UserMessage msg={msg} preview={preview} index={index} />
  }
  if (msg.role === 'assistant') {
    return <AiMessage msg={msg} preview={preview} index={index} />
  }
})

export default ChatItem
