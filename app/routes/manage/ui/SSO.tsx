import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef
} from '@tanstack/react-table'
import { PencilLine, Trash } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useMemo } from 'react'
import { trpc } from '~/.client/trpc'
import { Button } from '~/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '~/components/ui/table'
import { useLocalState } from '~/hooks/localState'
import { AddSsoProvider } from './AddSsoProvider'
import { useAccess } from '~/lib/access'
import type { Selectable } from 'kysely'
import type { AuthProviders } from 'server/lib/db/types'

export interface SSOInstance {
  add: () => void
}

interface SSOProps {
  instance?: SSOInstance
}

type AuthProviderData = Selectable<AuthProviders>
export const SSO = observer(({ instance }: SSOProps) => {
  const { hasAccess } = useAccess()
  const columns: ColumnDef<AuthProviderData>[] = useMemo(() => {
    return [
      {
        accessorKey: 'name',
        header: '名称',
        cell: ({ row }) => (
          <div className='capitalize'>{row.getValue('name')}</div>
        )
      },
      {
        accessorKey: 'scopes',
        header: 'scopes',
        cell: ({ row }) => (
          <div className='capitalize'>{row.getValue('scopes')}</div>
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
                disabled={!hasAccess('manageSso')}
                onClick={() => {
                  setState({
                    selectedSsoProviderId: data.id,
                    openAddSsoProvider: true
                  })
                }}
              >
                <PencilLine className={'size-3'} />
              </Button>
              <Button
                variant='outline'
                size='icon-sm'
                disabled={!hasAccess('manageSso')}
              >
                <Trash className={'size-3'} />
              </Button>
            </div>
          )
        }
      }
    ] as ColumnDef<AuthProviderData>[]
  }, [])
  const [state, setState] = useLocalState({
    data: [] as AuthProviderData[],
    openAddSsoProvider: false,
    selectedSsoProviderId: null as null | number
  })
  const getProviders = useCallback(() => {
    trpc.manage.getAuthProviders.query().then((res) => {
      setState({ data: res as AuthProviderData[] })
    })
  }, [])

  useEffect(() => {
    getProviders()
  }, [])

  useEffect(() => {
    if (instance) {
      instance.add = () => {
        setState({ openAddSsoProvider: true, selectedSsoProviderId: null })
      }
    }
  }, [instance, getProviders])
  const table = useReactTable({
    data: state.data,
    columns,
    getCoreRowModel: getCoreRowModel()
  })
  return (
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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className='h-24 text-center'>
                暂无结果。
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <AddSsoProvider
        onClose={() => setState({ openAddSsoProvider: false })}
        onUpdate={() => getProviders()}
        open={state.openAddSsoProvider}
        id={state.selectedSsoProviderId}
      />
    </div>
  )
})
