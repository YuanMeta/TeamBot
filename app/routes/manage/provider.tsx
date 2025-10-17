import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import { MoreHorizontal, PencilLine, Plus, Trash } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '~/components/ui/table'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import { observer } from 'mobx-react-lite'
import { useLocalState } from '~/hooks/localState'
import { AddProvide } from './ui/AddProvider'
import type { Provider } from '@prisma/client'
import { useEffect, useMemo } from 'react'
import { trpc } from '~/.client/trpc'

export default observer(() => {
  const columns: ColumnDef<Provider>[] = useMemo(() => {
    return [
      {
        accessorKey: 'name',
        header: '名称',
        cell: ({ row }) => (
          <div className='capitalize'>{row.getValue('name')}</div>
        )
      },
      {
        accessorKey: 'mode',
        header: '提供者',
        cell: ({ row }) => (
          <div className='capitalize'>{row.getValue('mode')}</div>
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
                    selectedProviderId: data.id,
                    openProviderForm: true
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
    ] as ColumnDef<Provider>[]
  }, [])
  const [state, setState] = useLocalState({
    openProviderForm: false,
    selectedProviderId: null as null | string,
    data: [] as Provider[]
  })
  useEffect(() => {
    trpc.manage.getProviders.query().then((res) => {
      setState({ data: res })
    })
  }, [])
  const table = useReactTable({
    data: state.data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  })
  return (
    <div className='w-full'>
      <div className={`${state.openProviderForm ? 'hidden' : ''}`}>
        <div className='flex items-center pb-4 justify-between'>
          <div>
            <Button
              onClick={() => {
                setState({
                  selectedProviderId: null,
                  openProviderForm: true
                })
              }}
            >
              <Plus />
              Model Provider
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
      </div>
      {state.openProviderForm && (
        <AddProvide
          open={state.openProviderForm}
          id={state.selectedProviderId}
          onClose={() => setState({ openProviderForm: false })}
        />
      )}
    </div>
  )
})
