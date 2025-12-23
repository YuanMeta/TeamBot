import { Users, Waypoints } from 'lucide-react'

import { observer } from 'mobx-react-lite'
import { SSO } from './ui/SSO'
import type { UserData } from '~/.server/db/type'
import { Tabs } from 'antd'
import { MemberList } from './ui/MemberList'

type MemberData = UserData & { roles: string[] }
export default observer(() => {
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
