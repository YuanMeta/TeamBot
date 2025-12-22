import { observer } from 'mobx-react-lite'
import { useAccess } from '~/lib/access'
import { useLocalState } from '~/hooks/localState'
import { useCallback } from 'react'
import { trpc } from '~/.client/trpc'
import type { MCPParams, ToolData } from 'server/db/type'
import { useEffect } from 'react'
import { Button, Form, Input, Modal, Radio, Table } from 'antd'
import { IconButton } from '~/components/project/icon-button'
import { adminConfirmDialog$ } from '~/components/project/confirm-dialog'
import { PencilLine, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { TableHeader } from './TableHeader'
import { PlusOutlined } from '@ant-design/icons'
import CodeEditor from '~/components/project/Code'
import z from 'zod'
import { cid } from '~/lib/utils'

export const AddMcp = observer(
  (props: {
    open: boolean
    id?: string
    onClose: () => void
    onUpdate: () => void
  }) => {
    const [state, setState] = useLocalState({
      submitting: false
    })
    const [form] = Form.useForm()
    const submit = useCallback(async () => {
      return form.validateFields().then(async (value) => {
        setState({ submitting: true })
        try {
          const headers = JSON.parse(value.headers)
          await trpc.common.mcpConnectTest.mutate({
            url: value.url,
            type: value.type,
            headers
          })
          if (props.id) {
            await trpc.manage.updateTool.mutate({
              id: props.id,
              data: {
                name: value.name,
                description: value.name,
                params: {
                  mcp: {
                    url: value.url,
                    type: value.type,
                    headers
                  } as MCPParams
                }
              }
            })
          } else {
            await trpc.manage.createTool.mutate({
              id: cid(),
              name: value.name,
              description: value.name,
              type: 'mcp',
              params: {
                mcp: {
                  url: value.url,
                  type: value.type,
                  headers
                } as MCPParams
              }
            })
          }
          props.onUpdate()
          props.onClose()
        } catch (e: any) {
          toast.error(e.message)
        } finally {
          setState({ submitting: false })
        }
      })
    }, [props.id, form])
    useEffect(() => {
      if (props.open) {
        form.resetFields()
        if (props.id) {
          trpc.manage.getTool.query(props.id).then((res) => {
            if (res) {
              form.setFieldsValue({
                name: res.name,
                url: res.params?.mcp?.url,
                type: res.params?.mcp?.type,
                headers: JSON.stringify(
                  res.params?.mcp?.headers || '{}',
                  null,
                  2
                )
              })
            }
          })
        }
      }
    }, [props.open, props.id])
    return (
      <Modal
        open={props.open}
        onCancel={props.onClose}
        title={props.id ? '编辑MCP' : '添加MCP'}
        width={500}
        confirmLoading={state.submitting}
        onOk={submit}
      >
        <div>
          <Form form={form} layout='vertical'>
            <Form.Item
              name={'name'}
              label={'名称'}
              rules={[
                {
                  required: true,
                  message: '请输入MCP名称'
                }
              ]}
            >
              <Input placeholder='请输入MCP名称' />
            </Form.Item>
            <Form.Item
              name={'type'}
              label={'连接类型'}
              initialValue={'http'}
              rules={[
                {
                  required: true,
                  message: '请选择类型'
                }
              ]}
            >
              <Radio.Group
                options={[
                  { label: 'HTTP', value: 'http' },
                  { label: 'SSE', value: 'sse' }
                ]}
              >
                <Radio value='http'>HTTP</Radio>
                <Radio value='sse'>SSE</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item
              name={'url'}
              label={'MCP URL'}
              rules={[
                {
                  required: true,
                  type: 'url',
                  message: '请输入正确的MCP URL'
                }
              ]}
            >
              <Input placeholder='https://example.com/mcp' />
            </Form.Item>
            <Form.Item
              name={['headers']}
              initialValue={'{}'}
              rules={[
                {
                  required: true,
                  validator: (_, value) => {
                    if (!value) {
                      return Promise.reject(new Error('请输入请求参数'))
                    }
                    try {
                      z.record(
                        z.string(),
                        z.union([z.string(), z.number()])
                      ).parse(JSON.parse(value))
                    } catch (e: any) {
                      return Promise.reject('请输入正确的键值对')
                    }
                    return Promise.resolve()
                  }
                }
              ]}
              label={'Headers'}
              tooltip={'HTTP请求头设置，JSON格式'}
            >
              <CodeEditor language={'json'} height={'100px'} />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    )
  }
)

export const Mcp = observer(() => {
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
        pageSize: state.pageSize,
        type: ['mcp']
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
      <TableHeader
        pagination={{
          total: state.total,
          pageSize: state.pageSize,
          current: state.page,
          onChange: (page) => {
            setState({ page })
            getTools()
          }
        }}
      >
        <Button
          icon={<PlusOutlined />}
          type={'primary'}
          disabled={!hasAccess('manageTools')}
          onClick={() => {
            setState({ openAddTool: true, selectedToolId: null })
          }}
        >
          MCP
        </Button>
      </TableHeader>
      <Table
        size={'small'}
        bordered={true}
        rowKey={'id'}
        dataSource={state.data}
        columns={[
          {
            title: '名称',
            dataIndex: 'name',
            key: 'name'
          },
          {
            title: 'URL',
            dataIndex: ['params', 'mcp', 'url']
          },
          {
            key: 'actions',
            render: (_, record) => {
              if (record.type === 'system') return null
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
                        content: '该操作无法撤销，确定要删除该MCP吗？',
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
        pagination={false}
      />
      <AddMcp
        open={state.openAddTool}
        onClose={() => setState({ openAddTool: false })}
        onUpdate={() => getTools()}
        id={state.selectedToolId || undefined}
      />
    </div>
  )
})
