import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table'
import { PencilLine, Plus, Trash, Users, Waypoints } from 'lucide-react'

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
import type { TableUser } from 'types/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { SSO, type SSOInstance } from './ui/Sso'
import { AddSsoProvider } from './ui/AddSsoProvider'

export default observer(() => {
  const columns: ColumnDef<TableUser>[] = useMemo(() => {
    return [
      {
        accessorKey: 'name',
        header: '成员名',
        cell: ({ row }) => (
          <div className='capitalize'>{row.getValue('name')}</div>
        )
      },
      {
        accessorKey: 'email',
        header: '邮箱',
        cell: ({ row }) => (
          <div className='capitalize'>{row.getValue('email')}</div>
        )
      },
      {
        header: '角色',
        accessorKey: 'role',
        cell: ({ row }) => (
          <div className='lowercase'>
            {row.getValue('role') === 'member' ? '成员' : '管理员'}
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
                onClick={() => {
                  setState({
                    selectedMemberId: data.id,
                    openAddMember: true
                  })
                }}
              >
                <PencilLine className={'size-3'} />
              </Button>
              <Button variant='outline' size='icon-sm'>
                <Trash className={'size-3'} />
              </Button>
            </div>
          )
        }
      }
    ] as ColumnDef<TableUser>[]
  }, [])
  const ssoInstance = useRef<SSOInstance>({} as SSOInstance)
  const [state, setState] = useLocalState({
    page: 1,
    pageSize: 10,
    keyword: '',
    tab: 'member',
    openAddMember: false,
    selectedMemberId: null as null | string,
    data: [] as TableUser[],
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
          <div className='flex items-center justify-between'>
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
                  variant={'outline'}
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
                  variant={'outline'}
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
              pageSize={state.pageSize}
              total={state.total}
              onPageChange={() => {}}
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
