import type { ColumnDef } from '@tanstack/react-table'
import { observer } from 'mobx-react-lite'
import { useMemo } from 'react'
import type { TableAssistantUsage } from 'types/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import { ModelIcon } from '~/lib/ModelIcon'

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
    const columns: ColumnDef<UsageRecord>[] = useMemo(() => {
      return [
        {
          accessorKey: 'assistantName',
          header: '名称',
          cell: ({ row }) => (
            <div className='capitalize'>{row.getValue('assistantName')}</div>
          )
        },
        {
          accessorKey: 'assistantMode',
          header: '提供者',
          cell: ({ row }) => (
            <div className='capitalize flex items-center gap-1.5'>
              <ModelIcon mode={row.getValue('assistantMode')} size={16} />
              {row.getValue('mode')}
            </div>
          )
        },

        {
          accessorKey: 'inputTokens',
          header: '输入Tokens',
          cell: ({ row }) => (
            <div className='lowercase'>{row.getValue('inputTokens')}</div>
          )
        },
        {
          accessorKey: 'outputTokens',
          header: '输出Tokens',
          cell: ({ row }) => (
            <div className='lowercase'>{row.getValue('outputTokens')}</div>
          )
        },
        {
          accessorKey: 'totalTokens',
          header: '总Tokens',
          cell: ({ row }) => (
            <div className='lowercase'>{row.getValue('totalTokens')}</div>
          )
        },
        {
          accessorKey: 'reasoningTokens',
          header: '推理Tokens',
          cell: ({ row }) => (
            <div className='lowercase'>{row.getValue('reasoningTokens')}</div>
          )
        },
        {
          accessorKey: 'cachedInputTokens',
          header: '缓存输入Tokens',
          cell: ({ row }) => (
            <div className='lowercase'>{row.getValue('cachedInputTokens')}</div>
          )
        }
      ] as ColumnDef<UsageRecord>[]
    }, [])
    return (
      <Dialog
        open={props.open}
        onOpenChange={(open) => {
          if (!open) {
            props.onClose()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>用量查询</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }
)
