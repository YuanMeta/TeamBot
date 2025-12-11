import { observer } from 'mobx-react-lite'
import { useCallback, useEffect } from 'react'
import type { AssistantData } from 'server/db/type'
import { trpc } from '~/.client/trpc'
import { useLocalState } from '~/hooks/localState'
import { useAccess } from '~/lib/access'
import { TableHeader } from './TableHeader'
import { Button, Table } from 'antd'
import { DashboardOutlined, PlusOutlined } from '@ant-design/icons'
import { PencilLine, Trash } from 'lucide-react'
import { adminConfirmDialog$ } from '~/components/project/confirm-dialog'
import { toast } from 'sonner'
import { Usage } from './Usage'
import { AddAssistant } from './AddAssistant'
import { IconButton } from '~/components/project/icon-button'

export const AssistantList = observer(() => {
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
              key: 'name'
            },
            {
              title: '提供者',
              dataIndex: 'mode',
              key: 'mode'
            },
            {
              title: '模型',
              dataIndex: 'models',
              key: 'models'
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
    </div>
  )
})
