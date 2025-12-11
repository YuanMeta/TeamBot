import { observer } from 'mobx-react-lite'
import { useAccess } from '~/lib/access'
import { useLocalState } from '~/hooks/localState'
import { useCallback } from 'react'
import { trpc } from '~/.client/trpc'
import type { ToolData } from 'server/db/type'
import { useEffect } from 'react'
import { Table } from 'antd'
import { IconButton } from '~/components/project/icon-button'
import { adminConfirmDialog$ } from '~/components/project/confirm-dialog'
import { PencilLine, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { AddTool } from './AddTool'

export const ToolList = observer(() => {
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
    <div>
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
                  <IconButton
                    hidden={!hasAccess('manageTools')}
                    onClick={() => {
                      setState({
                        selectedToolId: record.id,
                        openAddTool: true
                      })
                    }}
                  >
                    <PencilLine className={'size-3'} />
                  </IconButton>
                  <IconButton
                    hidden={!hasAccess('manageTools')}
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
                              toast.error(error.message)
                              throw error
                            })
                        }
                      })
                    }}
                  >
                    <Trash className={'size-3'} />
                  </IconButton>
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
  )
})
