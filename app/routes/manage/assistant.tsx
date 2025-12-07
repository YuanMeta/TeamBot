import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import { CircleGauge, PencilLine, Plus, Trash } from 'lucide-react'

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
import { AddAssistant } from './ui/AddAssistant'
import { useCallback, useEffect, useMemo } from 'react'
import { trpc } from '~/.client/trpc'
import { ModelIcon } from '~/lib/ModelIcon'
import { adminConfirmDialog$ } from '~/components/project/confirm-dialog'
import { Usage } from './ui/Usage'
import { useAccess } from '~/lib/access'
import { Pagination } from '~/components/project/pagination'
import type { Selectable } from 'kysely'
import type { Assistants } from 'server/lib/db/types'

type AssistantData = Selectable<Assistants>
export default observer(() => {
  const columns: ColumnDef<AssistantData>[] = useMemo(() => {
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
          <div className='capitalize flex items-center gap-1.5'>
            <ModelIcon mode={row.getValue('mode')} size={16} />
            {row.getValue('mode')}
          </div>
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
              <Button
                variant='outline'
                size='icon-sm'
                aria-label='Submit'
                onClick={() => {
                  adminConfirmDialog$.next({
                    title: '提示',
                    description:
                      '该操作无法撤销，删除后无法在使用此助手进行对话，确定要删除该助手吗？',
                    destructive: true,
                    onConfirm: () => {
                      return trpc.manage.deleteAssistant
                        .mutate({ assistantId: data.id })
                        .then(() => {
                          getAssistantsList()
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
    ] as ColumnDef<AssistantData>[]
  }, [])
  const [state, setState] = useLocalState({
    openProviderForm: false,
    selectedProviderId: null as null | number,
    data: [] as AssistantData[],
    openUsage: false,
    page: 1,
    pageSize: 10,
    total: 0
  })
  const { hasAccess } = useAccess()
  const getAssistantsList = useCallback(() => {
    trpc.manage.getAssistants
      .query({
        page: state.page,
        pageSize: state.pageSize
      })
      .then((res) => {
        setState({
          data: res.list as unknown as AssistantData[],
          total: res.total
        })
      })
  }, [])
  useEffect(() => {
    getAssistantsList()
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
          <div></div>
          <div className={'flex gap-3'}>
            <Button
              disabled={!hasAccess('manageAssistant')}
              onClick={() => {
                setState({
                  selectedProviderId: null,
                  openProviderForm: true
                })
              }}
            >
              <Plus />
              助手
            </Button>
            <Button
              variant='outline'
              disabled={!hasAccess('viewAssistantUsage')}
              onClick={() => {
                setState({
                  openUsage: true
                })
              }}
            >
              <CircleGauge />
              用量查询
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
      </div>
      <Pagination
        page={state.page}
        pageSize={state.pageSize}
        total={state.total}
        className={'mt-3'}
        onPageChange={(page) => {
          setState({ page })
          getAssistantsList()
        }}
      />
      {state.openProviderForm && (
        <AddAssistant
          open={state.openProviderForm}
          id={state.selectedProviderId}
          onChange={() => {
            getAssistantsList()
          }}
          onClose={() => setState({ openProviderForm: false })}
        />
      )}
      <Usage
        open={state.openUsage}
        onClose={() => setState({ openUsage: false })}
      />
    </div>
  )
})
