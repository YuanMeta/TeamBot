import { Modal, Select, Table, Tag } from 'antd'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useMemo } from 'react'
import { trpc } from '~/.client/trpc'
import { useLocalState } from '~/hooks/localState'
import { ModelIcon } from '~/lib/ModelIcon'
import { HelpText } from './HelpText'

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
  assistantId: number
  assistantName: string
  assistantMode: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  reasoningTokens: number
  cachedInputTokens: number
  createdAt: string
}

const ModelUsage = observer((props: { assistantId: number }) => {
  const [state, setState] = useLocalState({
    data: [] as {
      model: string
      inputTokens: number
      outputTokens: number
      totalTokens: number
      reasoningTokens: number
      cachedInputTokens: number
    }[],
    loading: false
  })
  useEffect(() => {
    setState({ loading: true })
    trpc.manage.getAssistantUsageInfo
      .query({ assistantId: props.assistantId, date: 'today' })
      .then((res) => {
        setState({ data: res })
      })
      .finally(() => {
        setState({ loading: false })
      })
  }, [props.assistantId])
  return (
    <Table
      size={'small'}
      scroll={{ y: 300 }}
      dataSource={state.data}
      loading={state.loading}
      pagination={false}
      rowKey={'model'}
      columns={[
        {
          title: '模型',
          dataIndex: 'model',
          key: 'model',
          width: 180,
          render: (value) => <Tag color={'cyan'}>{value}</Tag>
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
    />
  )
})
export const Usage = observer(
  (props: { open: boolean; onClose: () => void }) => {
    const [state, setState] = useLocalState({
      data: [] as UsageRecord[],
      date: 'today',
      loading: false
    })
    const getUsageInfo = useCallback(() => {
      setState({ loading: true, data: [] })
      trpc.manage.getUsageInfo
        .query({ date: state.date })
        .then((res) => {
          setState({ data: res as unknown as UsageRecord[] })
        })
        .finally(() => {
          setState({ loading: false })
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
        title={
          <div className={'text-sm flex items-center gap-2'}>
            用量查询
            <HelpText text='用量统计不仅包含对话中的Tokens, 还包括生成对话标题，压缩对话记录，规划查询等常规任务消耗的Token, 部分平台可能无法统计缓存Token和推理Token。' />
          </div>
        }
        footer={null}
        width={900}
      >
        <div className={'pt-1'}>
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
            scroll={{ y: 500 }}
            loading={state.loading}
            expandable={{
              expandedRowRender: (record) => (
                <ModelUsage assistantId={record.assistantId} />
              )
            }}
            columns={[
              {
                title: '助手',
                dataIndex: 'assistantName',
                key: 'assistantName',
                width: 200,
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
            rowKey={'assistantId'}
            size={'small'}
          />
        </div>
      </Modal>
    )
  }
)
