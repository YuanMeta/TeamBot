import { Bot, Globe, Shovel } from 'lucide-react'

import { observer } from 'mobx-react-lite'
import { useLocalState } from '~/hooks/localState'
import { useCallback, useEffect } from 'react'
import { trpc } from '~/.client/trpc'
import type { AssistantData } from 'server/db/type'
import { Tabs } from 'antd'
import { AssistantList } from './ui/AssistantList'

export default observer(() => {
  const [state, setState] = useLocalState({
    openProviderForm: false,
    selectedProviderId: null as null | number,
    data: [] as AssistantData[],
    openUsage: false,
    page: 1,
    pageSize: 10,
    total: 0
  })
  const getAssistantsList = useCallback(() => {
    trpc.manage.getAssistants
      .query({
        page: state.page,
        pageSize: state.pageSize
      })
      .then((res) => {
        setState({
          data: res.list as unknown as AssistantData[],
          total: res.total
        })
      })
  }, [])
  useEffect(() => {
    getAssistantsList()
  }, [])
  return (
    <div className='w-full'>
      <Tabs
        defaultActiveKey='assistant'
        items={[
          {
            key: 'assistant',
            label: (
              <div className={'flex items-center gap-1.5'}>
                <Bot size={16} />
                助手
              </div>
            ),
            children: <AssistantList />
          },
          {
            key: 'tool',
            label: (
              <div className={'flex items-center gap-1.5'}>
                <Shovel size={16} />
                工具
              </div>
            ),
            children: <></>
          },
          {
            key: 'webSearch',
            label: (
              <div className={'flex items-center gap-1.5'}>
                <Globe size={16} />
                网络搜索
              </div>
            ),
            children: <></>
          }
        ]}
      />
    </div>
  )
})
