import { Bot, Globe, Recycle, Shovel } from 'lucide-react'

import { observer } from 'mobx-react-lite'
import { useLocalState } from '~/hooks/localState'
import { Tabs } from 'antd'
import { AssistantList } from './ui/AssistantList'
import { ToolList } from './ui/ToolList'
import { WebSearch } from './ui/WebSearch'
import { Mcp } from './ui/Mcp'

export default observer(() => {
  const [state, setState] = useLocalState({
    tabKey: 'assistant'
  })
  return (
    <div className='w-full'>
      <Tabs
        activeKey={state.tabKey}
        onTabClick={(key) => {
          setState({ tabKey: key })
        }}
        items={[
          {
            key: 'assistant',
            label: (
              <div className={'flex items-center gap-1.5'}>
                <Bot size={16} />
                助手
              </div>
            ),
            children: (
              <AssistantList
                key={state.tabKey !== 'assistant' ? 'active' : 'inactive'}
              />
            )
          },
          {
            key: 'tool',
            label: (
              <div className={'flex items-center gap-1.5'}>
                <Shovel size={16} />
                工具
              </div>
            ),
            children: <ToolList />
          },
          {
            key: 'mcp',
            label: (
              <div className={'flex items-center gap-1.5'}>
                <Recycle size={16} />
                MCP
              </div>
            ),
            children: <Mcp />
          },
          {
            key: 'webSearch',
            label: (
              <div className={'flex items-center gap-1.5'}>
                <Globe size={16} />
                网络搜索
              </div>
            ),
            children: <WebSearch />
          }
        ]}
      />
    </div>
  )
})
