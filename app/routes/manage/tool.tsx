import { PencilLine, Trash } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { observer } from 'mobx-react-lite'
import { useLocalState } from '~/hooks/localState'
import { useCallback, useEffect } from 'react'
import { Button as AButton, Table } from 'antd'
import { trpc } from '~/.client/trpc'
import { AddTool } from './ui/AddTool'
import { adminConfirmDialog$ } from '~/components/project/confirm-dialog'
import { toast } from 'sonner'
import { useAccess } from '~/lib/access'
import type { ToolData } from 'server/db/type'
import { PlusOutlined } from '@ant-design/icons'
export default observer(() => {
  const { hasAccess } = useAccess()
  const [state, setState] = useLocalState({
    page: 1,
    pageSize: 10,
    keyword: '',
    openAddTool: false,
    selectedToolId: null as null | string,
    data: [] as ToolData[],
    total: 0
  })
  const getTools = useCallback(() => {
    trpc.manage.getTools
      .query({
        page: state.page,
        pageSize: state.pageSize
      })
      .then((res) => {
        setState({ data: res.tools as ToolData[], total: res.total })
      })
  }, [])
  useEffect(() => {
    getTools()
  }, [])
  return (
    <div className='w-full'>
      <div>
        <div className='flex items-center pb-2 justify-between'>
          <div></div>
          <div>
            <AButton
              icon={<PlusOutlined />}
              onClick={() => {
                setState({ openAddTool: true, selectedToolId: null })
              }}
            >
              模型工具
            </AButton>
          </div>
        </div>
        <Table
          size={'small'}
          bordered={true}
          rowKey={'id'}
          dataSource={state.data}
          columns={[
            {
              title: 'ID',
              dataIndex: 'id',
              key: 'id'
            },
            {
              title: '名称',
              dataIndex: 'name',
              key: 'name'
            },
            {
              title: '描述',
              dataIndex: 'description',
              ellipsis: true
            },
            {
              key: 'actions',
              render: (_, record) => {
                return (
                  <div className={'flex gap-2'}>
                    <Button
                      variant='outline'
                      size='icon-sm'
                      disabled={!hasAccess('manageTools')}
                      onClick={() => {
                        setState({
                          selectedToolId: record.id,
                          openAddTool: true
                        })
                      }}
                    >
                      <PencilLine className={'size-3'} />
                    </Button>
                    <Button
                      variant='outline'
                      size='icon-sm'
                      disabled={!hasAccess('manageTools')}
                      onClick={() => {
                        adminConfirmDialog$.next({
                          title: '提示',
                          content: '该操作无法撤销，确定要删除该工具吗？',
                          okButtonProps: { danger: true },
                          onOk: () => {
                            return trpc.manage.deleteTool
                              .mutate({ toolId: record.id })
                              .then(() => {
                                getTools()
                              })
                              .catch((error) => {
                                toast.error(error.message, {
                                  position: 'top-right'
                                })
                                throw error
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
          ]}
          pagination={{
            total: state.total,
            pageSize: state.pageSize,
            current: state.page,
            onChange: (page) => {
              setState({ page })
              getTools()
            }
          }}
        />
        <AddTool
          open={state.openAddTool}
          onClose={() => setState({ openAddTool: false })}
          onUpdate={() => getTools()}
          id={state.selectedToolId || undefined}
        />
      </div>
    </div>
  )
})
