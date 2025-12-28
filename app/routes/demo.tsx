import { observer } from 'mobx-react-lite'
import { useChat } from '@ai-sdk/react'
import { lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai'
import { Button } from '~/components/ui/button'
import { Input } from 'antd'
import { useLocalState } from '~/hooks/localState'
import { useEffect } from 'react'

export default observer(() => {
  const [state, setState] = useLocalState({
    input: ''
  })
  const { messages, addToolApprovalResponse, sendMessage, status } = useChat({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses
  })
  useEffect(() => {
    console.log('messages', messages)
  }, [status])
  return (
    <div className='flex flex-col p-5'>
      <div className={'mb-3 flex items-center gap-3'}>
        <Input
          value={state.input}
          onChange={(e) => setState({ input: e.target.value })}
        />
        <Button
          onClick={() => {
            sendMessage({
              text: state.input
            })
            setState({ input: '' })
          }}
        >
          Start
        </Button>{' '}
        Stream:
      </div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.parts.map((part, i) => {
            if (part.type === 'text') {
              return (
                <div key={i}>
                  {message.role}:{part.text}
                </div>
              )
            }
            if (part.type === 'tool-getWeather') {
              switch (part.state) {
                case 'approval-requested':
                  return (
                    <div key={part.toolCallId} className={'space-x-5'}>
                      <p>Get weather for {JSON.stringify(part.input)}?</p>
                      <button
                        onClick={() => {
                          console.log('approve', part)
                          addToolApprovalResponse({
                            id: part.approval.id,
                            approved: true
                          })
                        }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          addToolApprovalResponse({
                            id: part.approval.id,
                            approved: false
                          })
                        }
                      >
                        Deny
                      </button>
                    </div>
                  )
                case 'output-available':
                  return (
                    <div key={part.toolCallId}>
                      {JSON.stringify(part.output)}
                    </div>
                  )
              }
            }
          })}
        </div>
      ))}
    </div>
  )
})
