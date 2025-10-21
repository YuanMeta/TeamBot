import { UserMessage } from './UserMessage'
import { AiMessage } from './AiMessage'
import { observer } from 'mobx-react-lite'
import type { MessageData } from '../../store/store'

const ChatItem = observer<{ msg: MessageData }>(({ msg }) => {
  if (msg.role === 'user') {
    return <UserMessage msg={msg} />
  }
  if (msg.role === 'assistant') {
    return <AiMessage msg={msg} />
  }
})

export default ChatItem
