import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef
} from '@tanstack/react-table'
import { Delete, Plus } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useMemo } from 'react'
import { trpc } from '~/.client/trpc'
import { Pagination } from '~/components/project/pagination'
import { PopConfirm } from '~/components/project/popconfirm'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import { SelectFilter } from '~/components/project/select-filter'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '~/components/ui/table'
import { useLocalState } from '~/hooks/localState'
import { toast } from 'sonner'
import type { Selectable } from 'kysely'
import type { Users } from 'server/lib/db/types'

type UserData = Selectable<Users>
export const RoleMember = observer(
  (props: { roleId: number; open: boolean; onClose: () => void }) => {
    const [state, setState] = useLocalState({
      data: [] as UserData[],
      page: 1,
      pageSize: 10,
      total: 0,
      selectedMemberId: null as null | number
    })
    const columns: ColumnDef<UserData>[] = useMemo(() => {
      return [
        {
          accessorKey: 'name',
          header: '成员名',
          cell: ({ row }) => (
            <div className='capitalize flex items-center gap-1.5'>
              <div className={'truncate'}>{row.getValue('name')}</div>
            </div>
          )
        },
        {
          accessorKey: 'email',
          header: '邮箱',
          cell: ({ row }) => (
            <div className='lowercase'>{row.getValue('email')}</div>
          )
        },
        {
          accessorKey: 'action',
          header: null,
          cell: ({ row }) => (
            <div>
              <PopConfirm
                description={'移除后该成员不在拥有该角色，是否继续？'}
                okButtonProps={{ variant: 'destructive' }}
                onOk={() => {
                  return trpc.manage.remoteRoleFromUser
                    .mutate({
                      roleId: props.roleId,
                      userId: row.original.id
                    })
                    .then(() => {
                      getRoleMembers()
                    })
                }}
              >
                <Button size={'icon-sm'} variant={'ghost'}>
                  <Delete />
                </Button>
              </PopConfirm>
            </div>
          )
        }
      ] as ColumnDef<UserData>[]
    }, [props.roleId])
    const table = useReactTable({
      data: state.data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel()
    })
    const getRoleMembers = useCallback(() => {
      trpc.manage.getRoleMembers
        .query({
          roleId: props.roleId,
          page: state.page,
          pageSize: state.pageSize
        })
        .then((res) => {
          setState({
            data: res.list as unknown as UserData[],
            total: res.total
          })
        })
    }, [props.roleId])
    useEffect(() => {
      if (props.open) {
        setState({ page: 1, total: 0, selectedMemberId: null })
        getRoleMembers()
      }
    }, [props.open, props.roleId])
    return (
      <Dialog
        open={props.open}
        onOpenChange={(open) => {
          if (!open) {
            props.onClose()
          }
        }}
      >
        <DialogContent
          className={'max-w-[700px]! w-[700px]!'}
          autoFocus={false}
        >
          <DialogHeader>
            <DialogTitle className={'flex items-center gap-3'}>
              角色成员
            </DialogTitle>
          </DialogHeader>
          <div className={'px-3 mt-1 pb-3 max-h-[400px] overflow-y-auto'}>
            <div className={'flex items-center gap-3 justify-between py-1'}>
              <div className={'flex items-center gap-3'}>
                <SelectFilter
                  size={'sm'}
                  className={'w-36'}
                  value={state.selectedMemberId}
                  onValueChange={(value) => {
                    setState({ selectedMemberId: value as number })
                  }}
                  fetchOptions={(keyword) =>
                    trpc.manage.searchMembers.query({ keyword }).then((res) =>
                      res.map((item) => ({
                        label: item.name!,
                        value: item.id
                      }))
                    )
                  }
                  placeholder={'选择成员'}
                />
                <Button
                  size={'sm'}
                  onClick={() => {
                    if (state.selectedMemberId) {
                      trpc.manage.addRoleToUser
                        .mutate({
                          roleId: props.roleId,
                          userId: state.selectedMemberId
                        })
                        .then(() => {
                          getRoleMembers()
                          setState({ selectedMemberId: null })
                        })
                        .catch((error: any) => {
                          toast.error(error.message, {
                            position: 'top-right'
                          })
                        })
                    }
                  }}
                >
                  <Plus />
                  添加
                </Button>
              </div>

              <div>
                <Pagination
                  page={state.page}
                  pageSize={state.pageSize}
                  total={state.total}
                  onPageChange={(page) => {
                    setState({ page })
                    getRoleMembers()
                  }}
                />
              </div>
            </div>
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
        </DialogContent>
      </Dialog>
    )
  }
)
