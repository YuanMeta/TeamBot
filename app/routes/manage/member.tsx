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
          type={'card'}
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
        {/* <Tabs
          value={state.tab}
          onValueChange={(value) =>
            setState({ tab: value as 'member' | 'sso' })
          }
        >
          <div className='flex items-center justify-between pb-2'>
            <TabsList>
              <TabsTrigger value='member'>
                <Users />
                成员
              </TabsTrigger>
              <TabsTrigger value='sso'>
                <Waypoints />
                SSO
              </TabsTrigger>
            </TabsList>
            <div>
              {state.tab === 'member' && (
                <Button
                  disabled={!hasAccess('manageMemberAndRole')}
                  onClick={() => {
                    setState({ openAddMember: true, selectedMemberId: null })
                  }}
                >
                  <Plus />
                  成员
                </Button>
              )}
              {state.tab === 'sso' && (
                <Button
                  disabled={!hasAccess('manageSso')}
                  onClick={() => {
                    ssoInstance.current.add?.()
                  }}
                >
                  <Plus />
                  SSO认证
                </Button>
              )}
            </div>
          </div>
          <TabsContent value='member'>
            <div className='overflow-hidden rounded-md border'>
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className='h-24 text-center'
                      >
                        暂无结果。
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <Pagination
              page={state.page}
              className={'mt-3'}
              showTotal={true}
              pageSize={state.pageSize}
              total={state.total}
              onPageChange={(page) => {
                setState({ page })
                getMembers()
              }}
            />
          </TabsContent>
          <TabsContent value='sso'>
            <SSO instance={ssoInstance.current} />
          </TabsContent>
        </Tabs>
        <AddMember
          open={state.openAddMember}
          onUpdate={() => getMembers()}
          id={state.selectedMemberId || undefined}
          onClose={() => setState({ openAddMember: false })}
        /> */}
      </div>
    </div>
  )
})
