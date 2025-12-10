import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table'
import { PencilLine, Plus, Trash, Users } from 'lucide-react'

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
import { useCallback, useEffect, useMemo } from 'react'
import { trpc } from '~/.client/trpc'
import { Pagination } from '~/components/project/pagination'
import { adminConfirmDialog$ } from '~/components/project/confirm-dialog'
import { toast } from 'sonner'
import { useAccess } from '~/lib/access'
import { AddRole } from './ui/AddRole'
import { RoleMember } from './ui/RoleMember'
import type { Selectable } from 'kysely'
import type { Roles } from 'server/lib/db/types'

type RoleData = Selectable<Roles>
export default observer(() => {
  const { hasAccess } = useAccess()
  const columns: ColumnDef<RoleData>[] = useMemo(() => {
    return [
      {
        accessorKey: 'name',
        header: '名称',
        cell: ({ row }) => <div>{row.getValue('name')}</div>
      },
      {
        accessorKey: 'remark',
        header: '备注',
        cell: ({ row }) => (
          <span className='text-sm text-secondary-foreground/90'>
            {row.getValue('remark')}
          </span>
        )
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const data = row.original
          return (
            <div className={'flex gap-2'}>
              <Button
                variant={'outline'}
                size={'icon-sm'}
                onClick={() => {
                  setState({
                    selectedRoleId: data.id,
                    openRoleMember: true
                  })
                }}
              >
                <Users />
              </Button>
              <Button
                variant='outline'
                size='icon-sm'
                disabled={!hasAccess('manageMemberAndRole')}
                onClick={() => {
                  setState({
                    selectedRoleId: data.id,
                    openAddRole: true
                  })
                }}
              >
                <PencilLine className={'size-3'} />
              </Button>
              <Button
                variant='outline'
                size='icon-sm'
                disabled={!hasAccess('manageMemberAndRole')}
                onClick={() => {
                  adminConfirmDialog$.next({
                    title: '提示',
                    description: '无法删除已被用户使用的角色，是否继续？',
                    destructive: true,
                    onConfirm: () => {
                      return trpc.manage.deleteRole
                        .mutate(data.id)
                        .then(() => {
                          getRoles()
                        })
                        .catch((error) => {
                          toast.error(error.message, {
                            position: 'top-right'
                          })
                          throw error
                        })
                    }
                  })
                }}
              >
                <Trash className={'size-3'} />
              </Button>
            </div>
          )
        }
      }
    ] as ColumnDef<RoleData>[]
  }, [])
  const [state, setState] = useLocalState({
    page: 1,
    pageSize: 10,
    keyword: '',
    openAddRole: false,
    selectedRoleId: null as null | number,
    data: [] as RoleData[],
    total: 0,
    openRoleMember: false
  })
  const getRoles = useCallback(() => {
    trpc.manage.getRoles
      .query({
        page: state.page,
        pageSize: state.pageSize
      })
      .then((res) => {
        setState({ data: res.list as any, total: res.total })
      })
  }, [])
  useEffect(() => {
    getRoles()
  }, [])
  const table = useReactTable({
    data: state.data,
    columns,
    getCoreRowModel: getCoreRowModel()
  })
  return (
    <div className='w-full'>
      <div>
        <div className='flex items-center pb-4 justify-between'>
          <div></div>
          <div>
            <Button
              disabled={!hasAccess('manageMemberAndRole')}
              onClick={() => {
                setState({ openAddRole: true, selectedRoleId: null })
              }}
            >
              <Plus />
              角色
            </Button>
          </div>
        </div>
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
          className={'mt-3'}
          onPageChange={(page) => {
            setState({ page })
            getRoles()
          }}
        />
        <AddRole
          open={state.openAddRole}
          id={state.selectedRoleId}
          onClose={() => {
            setState({ openAddRole: false, selectedRoleId: null })
          }}
          onUpdate={() => {
            getRoles()
          }}
        />
        <RoleMember
          open={state.openRoleMember}
          onClose={() => {
            setState({ openRoleMember: false })
          }}
          roleId={state.selectedRoleId!}
        />
      </div>
    </div>
  )
})
