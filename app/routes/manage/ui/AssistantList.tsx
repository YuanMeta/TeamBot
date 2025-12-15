import { observer } from 'mobx-react-lite'
import { useCallback, useEffect } from 'react'
import type { AssistantData } from 'server/db/type'
import { trpc } from '~/.client/trpc'
import { useLocalState } from '~/hooks/localState'
import { useAccess } from '~/lib/access'
import { TableHeader } from './TableHeader'
import { Button, Table, Tag } from 'antd'
import { DashboardOutlined, PlusOutlined } from '@ant-design/icons'
import { PencilLine, Trash } from 'lucide-react'
import { adminConfirmDialog$ } from '~/components/project/confirm-dialog'
import { toast } from 'sonner'
import { Usage } from './Usage'
import { AddAssistant } from './AddAssistant'
import { IconButton } from '~/components/project/icon-button'
import { ModelIcon } from '~/lib/ModelIcon'
import { TextHelp } from '~/components/project/text-help'
import { TaskModel } from './TaskModel'

export const AssistantList = observer(() => {
  const [state, setState] = useLocalState({
    openProviderForm: false,
    selectedProviderId: null as null | number,
    data: [] as AssistantData[],
    openUsage: false,
    page: 1,
    pageSize: 10,
    total: 0,
    openTaskModel: false
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
  return (
    <div>
      <div className={`${state.openProviderForm ? 'hidden' : ''}`}>
        <TableHeader
          pagination={{
            pageSize: state.pageSize,
            total: state.total,
            current: state.page,
            onChange: (page) => {
              setState({ page })
              getAssistantsList()
            }
          }}
        >
          <Button
            icon={<PlusOutlined />}
            type={'primary'}
            onClick={() => {
              setState({ openProviderForm: true, selectedProviderId: null })
            }}
            disabled={!hasAccess('manageAssistant')}
          >
            助手
          </Button>
          <Button
            icon={<DashboardOutlined />}
            disabled={!hasAccess('viewAssistantUsage')}
            onClick={() => {
              setState({ openUsage: true })
            }}
          >
            用量查询
          </Button>
        </TableHeader>
        <Table
          size={'small'}
          dataSource={state.data}
          bordered={true}
          rowKey={'id'}
          pagination={false}
          columns={[
            {
              title: '名称',
              dataIndex: 'name',
              render: (value, record) => (
                <div className={'flex items-center gap-2'}>
                  <ModelIcon mode={record.mode} size={16} />
                  {value}
                </div>
              )
            },
            {
              title: '模型',
              dataIndex: 'models',
              key: 'models',
              render: (v) => (
                <div className={'flex flex-wrap gap-1'}>
                  {v.map((m: string) => (
                    <Tag key={m}>{m}</Tag>
                  ))}
                </div>
              )
            },
            {
              title: (
                <div className={'flex items-center gap-2'}>
                  <span>常规任务模型</span>
                  <TextHelp
                    size={15}
                    text='用于执行高频任务，如生成对话标题，压缩内容，规划查询等。建议使用响应速度快，价格便宜的模型，全局唯一，配置该参数，可降低成本。'
                  />
                </div>
              ),
              dataIndex: 'taskModel',
              render: (v) => (
                <div
                  className={
                    'inline-flex flex-wrap items-center cursor-pointer'
                  }
                  onClick={() => {
                    setState({ openTaskModel: true })
                  }}
                >
                  {v ? (
                    <Tag color={'blue'} variant={'outlined'}>
                      {v}
                    </Tag>
                  ) : (
                    <Tag variant={'outlined'}>-</Tag>
                  )}
                </div>
              )
            },
            {
              title: '操作',
              dataIndex: 'actions',
              key: 'actions',
              render: (_, record) => (
                <div className={'flex gap-2'}>
                  <IconButton
                    onClick={() => {
                      setState({
                        selectedProviderId: record.id,
                        openProviderForm: true
                      })
                    }}
                  >
                    <PencilLine />
                  </IconButton>
                  <IconButton
                    onClick={() => {
                      adminConfirmDialog$.next({
                        title: '提示',
                        content:
                          '该操作无法撤销，删除后无法在使用此助手进行对话，确定要删除该助手吗？',
                        okButtonProps: { danger: true },
                        onOk: () => {
                          return trpc.manage.deleteAssistant
                            .mutate({ assistantId: record.id })
                            .then(() => {
                              getAssistantsList()
                            })
                            .catch((error) => {
                              toast.error(error.message)
                            })
                        }
                      })
                    }}
                  >
                    <Trash />
                  </IconButton>
                </div>
              )
            }
          ]}
        />
      </div>

      <Usage
        open={state.openUsage}
        onClose={() => setState({ openUsage: false })}
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
      <TaskModel
        open={state.openTaskModel}
        onClose={() => setState({ openTaskModel: false })}
        onUpdate={() => {
          getAssistantsList()
        }}
      />
    </div>
  )
})
