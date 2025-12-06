import { Outlet, redirect } from 'react-router'
import { observer } from 'mobx-react-lite'
import { ManageSideBar } from './ui/SideBar'
import { AccessProvider } from '~/lib/access'
import type { Route } from './+types/manage'
import { isAdmin } from 'server/lib/db/query'

export const loader = async ({ context }: Route.LoaderArgs) => {
  if (context.root) {
    return null
  }
  const pass = await isAdmin(context.db, context.userId!)
  if (pass) {
    return null
  }
  return redirect('/chat')
}
export default observer(() => {
  return (
    <AccessProvider>
      <ManageSideBar>
        <div className={'overflow-y-auto h-0 flex-1 p-4'}>
          <Outlet />
        </div>
      </ManageSideBar>
    </AccessProvider>
  )
})
