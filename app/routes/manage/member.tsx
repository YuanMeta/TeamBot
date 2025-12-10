import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table'
import {
  KeyRound,
  PencilLine,
  Plus,
  Trash,
  Users,
  Waypoints
} from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '~/components/ui/table'
import { Button } from '~/components/ui/button'
import { observer } from 'mobx-react-lite'
import { useLocalState } from '~/hooks/localState'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { trpc } from '~/.client/trpc'
import { Pagination } from '~/components/project/pagination'
import { AddMember } from './ui/AddMemeber'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { SSO, type SSOInstance } from './ui/SSO'
import { useAccess } from '~/lib/access'
import { Badge } from '~/components/ui/badge'
import type { Selectable } from 'kysely'
import type { Users as UserType } from 'server/lib/db/types'

type MemberData = Selectable<UserType> & { roles: string[] }
export default observer(() => {
  const { hasAccess } = useAccess()
  const columns: ColumnDef<MemberData>[] = useMemo(() => {
    return [
      {
        accessorKey: 'name',
        header: '成员名',
        cell: ({ row }) => (
          <div className='capitalize flex items-center gap-1.5'>
            {row.getValue('name')}
            {row.original.root && (
              <KeyRound className='size-3.5 text-blue-500' />
            )}
          </div>
        )
      },
      {
        accessorKey: 'email',
        header: '邮箱',
        cell: ({ row }) => <div>{row.getValue('email')}</div>
      },
      {
        header: '角色',
        accessorKey: 'roles',
        cell: ({ row }) => (
          <div className='lowercase flex flex-wrap gap-1'>
            {row.original.root ? (
              <Badge variant={'secondary'}>超级管理员</Badge>
            ) : (
              (row.getValue('roles') as any)?.map((r: string) => (
                <Badge key={r} variant={'secondary'}>
                  {r}
                </Badge>
              ))
            )}
          </div>
        )
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const data = row.original
          return (
            <div className={'flex gap-2'}>
              <Button
                variant='outline'
                size='icon-sm'
                disabled={
                  !hasAccess('manageMemberAndRole') || row.original.root!
                }
                onClick={() => {
                  setState({
                    selectedMemberId: data.id,
                    openAddMember: true
                  })
                }}
              >
                <PencilLine className={'size-3'} />
              </Button>
              <Button
                variant='outline'
                size='icon-sm'
                disabled={
                  !hasAccess('manageMemberAndRole') || row.original.root!
                }
              >
                <Trash className={'size-3'} />
              </Button>
            </div>
          )
        }
      }
    ] as ColumnDef<MemberData>[]
  }, [])
  const ssoInstance = useRef<SSOInstance>({} as SSOInstance)
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
  const table = useReactTable({
    data: state.data,
    columns,
    getCoreRowModel: getCoreRowModel()
  })
  return (
    <div className='w-full'>
      <div>
        <Tabs
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
        />
      </div>
    </div>
  )
})
