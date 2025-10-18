import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table'
import { PencilLine, Plus, Trash } from 'lucide-react'

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
import type { User } from '@prisma/client'
import { useEffect, useMemo } from 'react'
import { trpc } from '~/.client/trpc'
import { Pagination } from '~/components/project/pagination'

export default observer(() => {
  const columns: ColumnDef<User>[] = useMemo(() => {
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
        header: '模型',
        accessorKey: 'models',
        cell: ({ row }) => (
          <div className='lowercase'>{row.getValue('models')}</div>
        )
      },
      // {
      //   accessorKey: '参数',
      //   cell: ({ row }) => <div className='lowercase'>{row.getValue('email')}</div>
      // },
      {
        id: 'actions',
        cell: ({ row }) => {
          const data = row.original
          return (
            <div className={'flex gap-2'}>
              <Button
                variant='outline'
                size='icon-sm'
                aria-label='Submit'
                onClick={() => {
                  setState({
                    selectedProviderId: data.id
                  })
                }}
              >
                <PencilLine className={'size-3'} />
              </Button>
              <Button variant='outline' size='icon-sm' aria-label='Submit'>
                <Trash className={'size-3'} />
              </Button>
            </div>
          )
        }
      }
    ] as ColumnDef<User>[]
  }, [])
  const [state, setState] = useLocalState({
    page: 1,
    pageSize: 10,
    keyword: '',
    selectedProviderId: null as null | string,
    data: [] as User[]
  })

  useEffect(() => {
    trpc.manage.getMembers
      .query({
        page: state.page,
        pageSize: state.pageSize,
        keyword: state.keyword
      })
      .then((res) => {
        setState({ data: res as any })
      })
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
          <div>
            <Button
              onClick={() => {
                table.setPageIndex(1)
              }}
            >
              <Plus />
              成员
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
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <Pagination page={1} pageSize={10} total={1} onPageChange={() => {}} />
      </div>
    </div>
  )
})
