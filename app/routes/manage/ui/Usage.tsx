import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef
} from '@tanstack/react-table'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useMemo } from 'react'
import { trpc } from '~/.client/trpc'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '~/components/ui/table'
import { useLocalState } from '~/hooks/localState'
import { ModelIcon } from '~/lib/ModelIcon'

// 格式化tokens显示
const formatTokens = (tokens: number): string => {
  if (tokens >= 1000000) {
    return (tokens / 1000000).toFixed(2) + 'M'
  } else if (tokens >= 1000) {
    return (tokens / 1000).toFixed(2) + 'K'
  }
  return tokens.toString()
}

type UsageRecord = {
  assistantName: string
  assistantMode: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  reasoningTokens: number
  cachedInputTokens: number
  createdAt: string
}
export const Usage = observer(
  (props: { open: boolean; onClose: () => void }) => {
    const [state, setState] = useLocalState({
      data: [] as UsageRecord[],
      date: 'today'
    })
    const columns: ColumnDef<UsageRecord>[] = useMemo(() => {
      return [
        {
          accessorKey: 'assistantName',
          header: '助手',
          cell: ({ row }) => (
            <div className='capitalize flex items-center gap-1.5'>
              <ModelIcon mode={row.original.assistantMode} size={16} />
              <div className={'truncate'}>{row.getValue('assistantName')}</div>
            </div>
          )
        },
        {
          accessorKey: 'inputTokens',
          header: '输入Tokens',
          cell: ({ row }) => (
            <div className='lowercase'>
              {formatTokens(row.getValue('inputTokens'))}
            </div>
          )
        },
        {
          accessorKey: 'outputTokens',
          header: '输出Tokens',
          cell: ({ row }) => (
            <div className='lowercase'>
              {formatTokens(row.getValue('outputTokens'))}
            </div>
          )
        },
        {
          accessorKey: 'reasoningTokens',
          header: '推理Tokens',
          cell: ({ row }) => (
            <div className='lowercase'>
              {formatTokens(row.getValue('reasoningTokens'))}
            </div>
          )
        },
        {
          accessorKey: 'cachedInputTokens',
          header: '缓存输入Tokens',
          cell: ({ row }) => (
            <div className='lowercase'>
              {formatTokens(row.getValue('cachedInputTokens'))}
            </div>
          )
        },
        {
          accessorKey: 'totalTokens',
          header: '总Tokens',
          cell: ({ row }) => (
            <div className='lowercase'>
              {formatTokens(row.getValue('totalTokens'))}
            </div>
          )
        }
      ] as ColumnDef<UsageRecord>[]
    }, [])
    const table = useReactTable({
      data: state.data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel()
    })
    const getUsageInfo = useCallback(() => {
      trpc.manage.getUsageInfo.query({ date: state.date }).then((res) => {
        setState({ data: res as unknown as UsageRecord[] })
      })
    }, [])
    useEffect(() => {
      if (props.open) {
        getUsageInfo()
      }
    }, [props.open, state.date])
    return (
      <Dialog
        open={props.open}
        onOpenChange={(open) => {
          if (!open) {
            props.onClose()
          }
        }}
      >
        <DialogContent className={'max-w-[700px]! w-[700px]!'}>
          <DialogHeader>
            <DialogTitle className={'flex items-center gap-3'}>
              用量查询
              <Select
                value={state.date}
                onValueChange={(value) => setState({ date: value })}
              >
                <SelectTrigger size={'sm'} className={'w-36'}>
                  <SelectValue placeholder='选择时间' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='today'>今天</SelectItem>
                  <SelectItem value='last3Days'>最近3天</SelectItem>
                  <SelectItem value='lastWeek'>最近1周</SelectItem>
                  <SelectItem value='lastMonth'>最近1月</SelectItem>
                  <SelectItem value='last3Months'>最近3月</SelectItem>
                </SelectContent>
              </Select>
            </DialogTitle>
          </DialogHeader>
          <div className={'px-3 mt-1 pb-3 max-h-[400px] overflow-y-auto'}>
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
