import { Outlet, redirect } from 'react-router'
import { observer } from 'mobx-react-lite'
import { ManageSideBar } from './ui/SideBar'
import { AccessProvider } from '~/lib/access'
import type { Route } from './+types/manage'

export const loader = async ({ context }: Route.LoaderArgs) => {
  if (context.root) {
    return null
  }
  const result = await context.db.raw(
    `
        SELECT COUNT(*) as count
        FROM user_roles ur
        JOIN access_roles ar ON ur.role_id = ar.role_id
        JOIN accesses a ON ar.access_id = a.id
        WHERE ur.user_id = ? AND a.name = 'admin'
      `,
    [context.userId]
  )
  const rows =
    (result as unknown as { rows?: Array<{ count: string | number }> }).rows ||
    []
  const isAdmin = rows.length > 0 && Number(rows[0].count) > 0
  if (isAdmin) {
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
