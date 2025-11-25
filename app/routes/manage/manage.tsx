import { BotMessageSquare, Users, CircleGauge, Wrench } from 'lucide-react'
import { Outlet } from 'react-router'
import { SidebarTrigger } from '~/components/ui/sidebar'
import { observer } from 'mobx-react-lite'
import { ManageSideBar } from './SideBar'

export default observer(() => {
  return (
    <ManageSideBar>
      <div className={'overflow-y-auto h-0 flex-1 p-4'}>
        <Outlet />
      </div>
    </ManageSideBar>
  )
})
