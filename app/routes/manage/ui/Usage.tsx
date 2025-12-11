import { Modal, Select, Table } from 'antd'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useMemo } from 'react'
import { trpc } from '~/.client/trpc'
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
      <Modal
        open={props.open}
        onCancel={props.onClose}
        title={'用量查询'}
        footer={null}
        width={700}
      >
        <div className={'max-h-[500px] overflow-y-auto'}>
          <div className={'mb-2'}>
            <Select
              value={state.date}
              className={'w-48'}
              onChange={(value) => setState({ date: value })}
              options={[
                { label: '今天', value: 'today' },
                { label: '最近3天', value: 'last3Days' },
                { label: '最近1周', value: 'lastWeek' },
                { label: '最近1月', value: 'lastMonth' },
                { label: '最近3月', value: 'last3Months' }
              ]}
            />
          </div>

          <Table
            dataSource={state.data}
            columns={[
              {
                title: '助手',
                dataIndex: 'assistantName',
                key: 'assistantName',
                render: (value, record) => (
                  <div className={'flex items-center gap-2'}>
                    <ModelIcon mode={record.assistantMode} size={16} />
                    {value}
                  </div>
                )
              },
              {
                title: '输入Tokens',
                dataIndex: 'inputTokens',
                render: (value) => formatTokens(value)
              },
              {
                title: '输出Tokens',
                dataIndex: 'outputTokens',
                render: (value) => formatTokens(value)
              },
              {
                title: '推理Tokens',
                dataIndex: 'reasoningTokens',
                render: (value) => formatTokens(value)
              },
              {
                title: '缓存输入Tokens',
                dataIndex: 'cachedInputTokens',
                render: (value) => formatTokens(value)
              },
              {
                title: '总Tokens',
                dataIndex: 'totalTokens',
                render: (value) => formatTokens(value)
              }
            ]}
            pagination={false}
            rowKey={'id'}
            size={'small'}
          />
        </div>
      </Modal>
    )
  }
)
