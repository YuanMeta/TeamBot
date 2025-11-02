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
import { useCallback, useEffect, useMemo } from 'react'
import { trpc } from '~/.client/trpc'
import { Pagination } from '~/components/project/pagination'
import type { TableTool } from 'types/table'
import { AddTool } from './ui/AddTool'
import { Badge } from '~/components/ui/badge'
import { TextHelp } from '~/components/project/text-help'

export default observer(() => {
  const columns: ColumnDef<TableTool>[] = useMemo(() => {
    return [
      {
        accessorKey: 'name',
        header: '名称',
        cell: ({ row }) => <div>{row.getValue('name')}</div>
      },
      {
        accessorKey: 'type',
        header: '类型',
        cell: ({ row }) => (
          <Badge variant={'outline'}>{row.getValue('type')}</Badge>
        )
      },
      {
        header: '描述',
        accessorKey: 'description',
        cell: ({ row }) => (
          <TextHelp text={row.getValue('description')} width={360}>
            <div className='max-w-80 truncate cursor-default'>
              {row.getValue('description')}
            </div>
          </TextHelp>
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
                    selectedToolId: data.id,
                    openAddTool: true
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
    ] as ColumnDef<TableTool>[]
  }, [])
  const [state, setState] = useLocalState({
    page: 1,
    pageSize: 10,
    keyword: '',
    openAddTool: false,
    selectedToolId: null as null | string,
    data: [] as TableTool[],
    total: 0
  })
  const getTools = useCallback(() => {
    trpc.manage.getTools
      .query({
        page: state.page,
        pageSize: state.pageSize
      })
      .then((res) => {
        setState({ data: res.tools as any, total: res.total })
      })
  }, [])
  useEffect(() => {
    getTools()
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
                setState({ openAddTool: true, selectedToolId: null })
              }}
            >
              <Plus />
              模型工具
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
                    暂无数据。
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
        <AddTool
          open={state.openAddTool}
          onClose={() => setState({ openAddTool: false })}
          onUpdate={() => getTools()}
          id={state.selectedToolId || undefined}
        />
      </div>
    </div>
  )
})
