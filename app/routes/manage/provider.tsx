import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import { ArrowUpDown, ChevronDown, MoreHorizontal, Plus } from 'lucide-react'

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
import { Input } from '~/components/ui/input'
import { observer } from 'mobx-react-lite'
import { useLocalState } from '~/hooks/localState'
import { AddProvide } from './ui/AddProvider'

const data: Payment[] = [
  // {
  //   id: 'm5gr84i9',
  //   amount: 316,
  //   status: 'success',
  //   email: 'ken99@example.com'
  // },
  // {
  //   id: '3u1reuv4',
  //   amount: 242,
  //   status: 'success',
  //   email: 'Abe45@example.com'
  // },
  // {
  //   id: 'derv1ws0',
  //   amount: 837,
  //   status: 'processing',
  //   email: 'Monserrat44@example.com'
  // },
  // {
  //   id: '5kma53ae',
  //   amount: 874,
  //   status: 'success',
  //   email: 'Silas22@example.com'
  // },
  // {
  //   id: 'bhqecj4p',
  //   amount: 721,
  //   status: 'failed',
  //   email: 'carmella@example.com'
  // }
]

export type Payment = {
  id: string
  amount: number
  status: 'pending' | 'processing' | 'success' | 'failed'
  email: string
}

export const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: 'status',
    header: '提供者',
    cell: ({ row }) => (
      <div className='capitalize'>{row.getValue('status')}</div>
    )
  },
  {
    accessorKey: '模型',
    cell: ({ row }) => <div className='lowercase'>{row.getValue('email')}</div>
  },
  {
    accessorKey: '参数',
    cell: ({ row }) => <div className='lowercase'>{row.getValue('email')}</div>
  },
  {
    accessorKey: 'amount',
    header: () => <div className='text-right'>Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'))

      // Format the amount as a dollar amount
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount)

      return <div className='text-right font-medium'>{formatted}</div>
    }
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const payment = row.original
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' className='h-8 w-8 p-0' autoFocus={false}>
              <span className='sr-only'>Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(payment.id)}
            >
              Copy payment ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View customer</DropdownMenuItem>
            <DropdownMenuItem>View payment details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  }
]

export default observer(() => {
  const [state, setState] = useLocalState({
    openProviderForm: false,
    selectedProviderId: null as null | string
  })
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  })

  return (
    <div className='w-full'>
      <div className={`${state.openProviderForm ? 'hidden' : ''}`}>
        <div className='flex items-center py-4 justify-between'>
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
          onClose={() => setState({ openProviderForm: false })}
        />
      )}
    </div>
  )
})
