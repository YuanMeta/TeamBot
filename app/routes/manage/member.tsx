import { Users, Waypoints } from 'lucide-react'

import { observer } from 'mobx-react-lite'
import { useLocalState } from '~/hooks/localState'
import { useCallback, useEffect } from 'react'
import { trpc } from '~/.client/trpc'
import { SSO } from './ui/SSO'
import type { UserData } from 'server/db/type'
import { Tabs } from 'antd'
import { MemberList } from './ui/MemberList'

type MemberData = UserData & { roles: string[] }
export default observer(() => {
  const [state, setState] = useLocalState({
    page: 1,
    pageSize: 10,
    keyword: '',
    tab: 'member',
    openAddMember: false,
    selectedMemberId: null as null | number,
    data: [] as MemberData[],
    total: 0
  })
  const getMembers = useCallback(() => {
    trpc.manage.getMembers
      .query({
        page: state.page,
        pageSize: state.pageSize,
        keyword: state.keyword
      })
      .then((res) => {
        setState({ data: res.members as any, total: res.total })
      })
  }, [])
  useEffect(() => {
    getMembers()
  }, [])
  return (
    <div className='w-full'>
      <div>
        <Tabs
          defaultActiveKey='member'
          items={[
            {
              key: 'member',
              label: (
                <div className={'flex items-center gap-1.5'}>
                  <Users size={16} /> 成员
                </div>
              ),
              children: <MemberList />
            },
            {
              key: 'sso',
              label: (
                <div className={'flex items-center gap-1.5'}>
                  <Waypoints size={16} /> SSO
                </div>
              ),
              children: <SSO />
            }
          ]}
        />
      </div>
    </div>
  )
})
