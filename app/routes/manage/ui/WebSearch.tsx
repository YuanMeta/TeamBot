import { observer } from 'mobx-react-lite'
import { useAccess } from '~/lib/access'
import { useLocalState } from '~/hooks/localState'
import { useCallback, useEffect } from 'react'
import { trpc } from '~/.client/trpc'
import { TableHeader } from './TableHeader'
import { Button, Form, Input, Modal, Select, Slider, Table } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { IconButton } from '~/components/project/icon-button'
import { PencilLine, Trash } from 'lucide-react'
import { adminConfirmDialog$ } from '~/components/project/confirm-dialog'
import { toast } from 'sonner'
import { searchModes } from './data'
import type { ToolData } from 'server/db/type'

const AddWebSearch = observer(
  (props: {
    open: boolean
    id: string | null
    onClose: () => void
    onUpdate: () => void
  }) => {
    const [form] = Form.useForm()
    const mode = Form.useWatch('mode', form)
    const [state, setState] = useLocalState({
      submitting: false
    })
    useEffect(() => {
      if (props.open) {
        form.resetFields()
        if (props.id) {
          trpc.manage.getWebSearch.query(props.id).then((res) => {
            form.setFieldsValue({
              name: res?.name,
              description: res?.description,
              mode: res?.webSearchMode,
              params: res?.params
            })
          })
        }
      }
    }, [props.open])
    return (
      <Modal
        open={props.open}
        title={props.id ? '编辑网络搜索' : '添加网络搜索'}
        width={420}
        onCancel={props.onClose}
        confirmLoading={state.submitting}
        onOk={() => {
          return form.validateFields().then(async (v) => {
            setState({ submitting: true })
            try {
              await trpc.manage.connectSearch.mutate({
                mode: v.mode,
                params: v.params.webSearch
              })
              if (props.id) {
                await trpc.manage.updateWebSearch.mutate({
                  id: props.id,
                  data: {
                    title: v.name,
                    description: v.description,
                    mode: v.mode,
                    params: v.params
                  }
                })
              } else {
                await trpc.manage.createWebSearch.mutate({
                  title: v.name,
                  description: v.description,
                  mode: v.mode,
                  params: v.params
                })
              }

              props.onClose()
              props.onUpdate()
            } catch (e: any) {
              toast.error(e.message)
            } finally {
              setState({ submitting: false })
            }
          })
        }}
      >
        <div className={'h-2'}></div>
        <Form form={form} layout={'vertical'}>
          <Form.Item
            name={'mode'}
            label={'搜索模式'}
            tooltip={
              '部分模型厂商提供了官方的搜索能力，可根据需要选择在助手中开启官方搜索或自己配置网络搜索工具。'
            }
            rules={[{ required: true, message: '请选择搜索模式' }]}
          >
            <Select
              placeholder={'选择搜索模式'}
              options={searchModes.map((mode) => ({
                label: (
                  <div className={'flex items-center gap-2'}>
                    <img
                      src={mode.icon}
                      alt={mode.label}
                      className={'size-4'}
                    />
                    {mode.label}
                  </div>
                ),
                value: mode.value
              }))}
            />
          </Form.Item>
          <Form.Item
            label={'名称'}
            name={'name'}
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder={'请输入名称'} />
          </Form.Item>

          <Form.Item
            label={'API Key'}
            name={['params', 'webSearch', 'apiKey']}
            rules={[{ required: true, message: '请输入API Key' }]}
          >
            <Input.Password placeholder={'请输入API Key'} />
          </Form.Item>
          {mode === 'google' && (
            <Form.Item
              label={'CSE ID'}
              name={['params', 'webSearch', 'modeParams', 'google', 'cseId']}
              rules={[{ required: true, message: '请输入CSE ID' }]}
            >
              <Input placeholder={'请输入CSE ID'} />
            </Form.Item>
          )}
          {mode === 'zhipu' && (
            <Form.Item
              label={'搜索引擎'}
              initialValue={'search_std'}
              rules={[{ required: true, message: '请选择搜索引擎' }]}
              name={[
                'params',
                'webSearch',
                'modeParams',
                'zhipu',
                'search_engine'
              ]}
            >
              <Select
                placeholder={'请选择搜索引擎'}
                options={[
                  { value: 'search_std', label: '标准搜索' },
                  { value: 'search_pro', label: '专业搜索' },
                  { value: 'search_pro_sogou', label: '搜狗专业搜索' },
                  { value: 'search_pro_quark', label: '夸克专业搜索' }
                ]}
              />
            </Form.Item>
          )}
          <Form.Item
            label={'最大查询条数'}
            name={['params', 'webSearch', 'count']}
            initialValue={5}
          >
            <Slider min={3} step={1} max={30} />
          </Form.Item>
          <Form.Item label={'备注'} name={'description'}>
            <Input.TextArea placeholder={'请输入备注'} />
          </Form.Item>
        </Form>
      </Modal>
    )
  }
)

export const WebSearch = observer(() => {
  const { hasAccess } = useAccess()
  const [state, setState] = useLocalState({
    page: 1,
    pageSize: 10,
    data: [] as ToolData[],
    total: 0,
    openAddWebSearch: false,
    selectedWebSearchId: null as null | string
  })
  const getWebSearches = useCallback(() => {
    trpc.manage.getWebSearches
      .query({
        page: state.page,
        pageSize: state.pageSize
      })
      .then((res) => {
        setState({ data: res.list as ToolData[], total: res.total })
      })
  }, [])
  useEffect(() => {
    getWebSearches()
  }, [])
  return (
    <div className='w-full'>
      <TableHeader
        pagination={{
          pageSize: state.pageSize,
          total: state.total,
          current: state.page,
          onChange: (page) => {
            setState({ page })
            getWebSearches()
          }
        }}
      >
        <Button
          disabled={!hasAccess('manageMemberAndRole')}
          icon={<PlusOutlined />}
          type={'primary'}
          onClick={() => {
            setState({ openAddWebSearch: true, selectedWebSearchId: null })
          }}
        >
          搜索工具
        </Button>
      </TableHeader>
      <Table
        size={'small'}
        bordered={true}
        rowKey={'id'}
        pagination={false}
        columns={[
          {
            title: '名称',
            dataIndex: 'name',
            render: (v, record) => {
              return (
                <div className={'flex items-center gap-2'}>
                  <img
                    src={
                      searchModes.find(
                        (mode) => mode.value === record.webSearchMode
                      )?.icon
                    }
                    alt={v}
                    className={'size-4'}
                  />
                  {v}
                </div>
              )
            }
          },
          {
            title: '备注',
            dataIndex: 'description',
            ellipsis: true
          },
          {
            title: '操作',
            dataIndex: 'actions',
            key: 'actions',
            render: (_, record) => {
              return (
                <div className={'space-x-2'}>
                  <IconButton
                    onClick={() => {
                      setState({
                        selectedWebSearchId: record.id,
                        openAddWebSearch: true
                      })
                    }}
                  >
                    <PencilLine />
                  </IconButton>
                  <IconButton
                    onClick={() => {
                      adminConfirmDialog$.next({
                        title: '提示',
                        content: '确定要删除该搜索工具吗？',
                        okButtonProps: { danger: true },
                        onOk: async () => {
                          await trpc.manage.deleteWebSearch
                            .mutate(record.id)
                            .then(() => getWebSearches())
                            .catch((error) => toast.error(error.message))
                        }
                      })
                    }}
                  >
                    <Trash />
                  </IconButton>
                </div>
              )
            }
          }
        ]}
        dataSource={state.data}
      />
      <AddWebSearch
        open={state.openAddWebSearch}
        id={state.selectedWebSearchId}
        onClose={() => {
          setState({ openAddWebSearch: false, selectedWebSearchId: null })
        }}
        onUpdate={() => {
          getWebSearches()
        }}
      />
    </div>
  )
})
