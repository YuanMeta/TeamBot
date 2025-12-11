import { observer } from 'mobx-react-lite'
import googleIcon from '~/assets/google.png'
import exaIcon from '~/assets/exa.png'
import tavilyIcon from '~/assets/tavily.png'
import bochaIcon from '~/assets/bocha.png'
import zhipuIcon from '~/assets/zhipu.png'
import { useAccess } from '~/lib/access'
import { useLocalState } from '~/hooks/localState'
import { useCallback, useEffect } from 'react'
import { trpc } from '~/.client/trpc'
import { TableHeader } from './TableHeader'
import { Button, Form, Input, Modal, Select, Table } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { IconButton } from '~/components/project/icon-button'
import { PencilLine, Trash } from 'lucide-react'
import { adminConfirmDialog$ } from '~/components/project/confirm-dialog'
import { toast } from 'sonner'
import type { WebSearchData } from 'server/db/type'
const searchModes = [
  {
    value: 'zhipu',
    label: '智谱搜索',
    icon: zhipuIcon
  },
  {
    value: 'bocha',
    label: '博查搜索',
    icon: bochaIcon
  },
  {
    value: 'google',
    label: 'Google',
    icon: googleIcon
  },
  {
    value: 'tavily',
    label: 'Tavily',
    icon: tavilyIcon
  },
  {
    value: 'exa',
    label: 'Exa',
    icon: exaIcon
  }
]

const AddWebSearch = observer(
  (props: {
    open: boolean
    id: number | null
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
              ...res,
              apiKey: res?.params?.apiKey,
              cseId: res?.params?.cseId
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
                apiKey: v.apiKey,
                cseId: v.cseId
              })
              if (props.id) {
                await trpc.manage.updateWebSearch.mutate({
                  id: props.id,
                  data: {
                    title: v.title,
                    description: v.description,
                    mode: v.mode,
                    params: {
                      apiKey: v.apiKey,
                      cseId: v.cseId
                    }
                  }
                })
              } else {
                await trpc.manage.createWebSearch.mutate({
                  title: v.title,
                  description: v.description,
                  mode: v.mode,
                  params: {
                    apiKey: v.apiKey,
                    cseId: v.cseId
                  }
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
            name={'title'}
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder={'请输入名称'} />
          </Form.Item>
          <Form.Item label={'备注'} name={'description'}>
            <Input.TextArea placeholder={'请输入备注'} />
          </Form.Item>
          <Form.Item
            label={'API Key'}
            name={'apiKey'}
            rules={[{ required: true, message: '请输入API Key' }]}
          >
            <Input.Password placeholder={'请输入API Key'} />
          </Form.Item>
          {mode === 'google' && (
            <Form.Item
              label={'CSE ID'}
              name={'cseId'}
              rules={[{ required: true, message: '请输入CSE ID' }]}
            >
              <Input placeholder={'请输入CSE ID'} />
            </Form.Item>
          )}
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
    data: [] as WebSearchData[],
    total: 0,
    openAddWebSearch: false,
    selectedWebSearchId: null as null | number
  })
  const getWebSearches = useCallback(() => {
    trpc.manage.getWebSearches
      .query({
        page: state.page,
        pageSize: state.pageSize
      })
      .then((res) => {
        setState({ data: res.list as WebSearchData[], total: res.total })
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
            dataIndex: 'title',
            render: (_, v) => {
              return (
                <div className={'flex items-center gap-2'}>
                  <img
                    src={
                      searchModes.find((mode) => mode.value === v.mode)?.icon
                    }
                    alt={v.title}
                    className={'size-4'}
                  />
                  {v.title}
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
