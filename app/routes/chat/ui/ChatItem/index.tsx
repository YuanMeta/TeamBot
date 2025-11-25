import { UserMessage } from './UserMessage'
import { AiMessage } from './AiMessage'
import { observer } from 'mobx-react-lite'
import type { MessageData } from '../../store/store'

const ChatItem = observer<{ msg: MessageData; preview?: boolean }>(
  ({ msg, preview = false }) => {
    if (msg.role === 'user') {
      return <UserMessage msg={msg} preview={preview} />
    }
    if (msg.role === 'assistant') {
      return <AiMessage msg={msg} preview={preview} />
    }
  }
)

export default ChatItem
