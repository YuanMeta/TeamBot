// import { useForm } from '@tanstack/react-form'
import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { trpc } from '~/.client/trpc'
import { useLocalState } from '~/hooks/localState'
import { Checkbox, Form, Input, Modal, Select } from 'antd'

const accessLabelMap: Record<string, string> = {
  manageAssistant: '管理助手',
  viewAssistantUsage: '查看助手Token用量',
  manageMemberAndRole: '管理成员与角色',
  manageSso: '管理SSO第三方登录',
  manageTools: '管理模型工具',
  manageWebSearch: '管理网络搜索'
}
export const AddRole = observer(
  (props: {
    open: boolean
    id: number | null
    onClose: () => void
    onUpdate: () => void
  }) => {
    const [state, setState] = useLocalState({
      access: [] as string[],
      allAssistant: true,
      submitting: false,
      selectedAccess: [] as string[],
      assistants: [] as { id: number; name: string }[]
    })
    const [form] = Form.useForm()
    const allAssistant = Form.useWatch('allAssistant', form)
    useEffect(() => {
      if (props.open) {
        form.resetFields()
        setState({ selectedAccess: [] })
        if (props.id) {
          trpc.manage.getRole.query(props.id).then((res) => {
            if (res) {
              form.setFieldsValue({
                name: res.name,
                remark: res.remark,
                allAssistant: res.allAssistants,
                assistants: res.assistants.map((a) => a.id) || []
              })
              setState({ selectedAccess: res.accesses.map((a) => a.id) })
            }
          })
        }
        trpc.manage.getAccesses.query().then((res) => {
          setState({ access: res.map((a) => a.id) })
        })
        trpc.manage.getAssistantOptions.query().then((res) => {
          setState({ assistants: res })
        })
      }
    }, [props.open, props.id])
    return (
      <Modal
        open={props.open}
        title={props.id ? '编辑角色' : '添加角色'}
        width={460}
        confirmLoading={state.submitting}
        onOk={() => {
          form.validateFields().then(async (v) => {
            setState({ submitting: true })
            try {
              if (props.id) {
                trpc.manage.updateRole.mutate({
                  id: props.id,
                  data: {
                    name: v.name,
                    remark: v.remark,
                    allAssistants: v.allAssistant,
                    assistants: v.assistants || [],
                    access: state.selectedAccess
                  }
                })
              } else {
                trpc.manage.createRole.mutate({
                  name: v.name,
                  remark: v.remark,
                  allAssistants: v.allAssistant,
                  assistants: v.assistants || [],
                  access: state.selectedAccess
                })
              }
              props.onClose()
              props.onUpdate()
            } finally {
              setState({ submitting: false })
            }
          })
        }}
        onCancel={() => {
          props.onClose()
        }}
      >
        <Form form={form} layout={'vertical'}>
          <Form.Item
            name={'name'}
            label={'名称'}
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder='请输入名称' />
          </Form.Item>

          <Form.Item
            label={'添加授权助手'}
            className={'space-y-5'}
            required={true}
          >
            <Form.Item
              noStyle={true}
              name={'allAssistant'}
              initialValue={true}
              valuePropName={'checked'}
            >
              <Checkbox>所有助手</Checkbox>
            </Form.Item>
            {!allAssistant && (
              <div className={'mt-3'}>
                <Form.Item noStyle={true} name={'assistants'} initialValue={[]}>
                  <Select
                    mode='multiple'
                    allowClear
                    options={state.assistants.map((a) => ({
                      label: a.name,
                      value: a.id
                    }))}
                    style={{ width: '100%' }}
                    placeholder='选择助手'
                  />
                </Form.Item>
              </div>
            )}
          </Form.Item>
          <Form.Item name={'remark'} label={'备注'}>
            <Input.TextArea placeholder='请输入备注' />
          </Form.Item>
          <Form.Item
            label={'权限'}
            tooltip={'开启管理员权限后，成员可进入管理系统'}
          >
            <Form.Item noStyle={true}>
              <Checkbox
                checked={state.selectedAccess.includes('admin')}
                onChange={(e) => {
                  setState({
                    selectedAccess: e.target.checked ? [...state.access] : []
                  })
                }}
              >
                管理员
              </Checkbox>
            </Form.Item>
            {state.selectedAccess.includes('admin') && (
              <div className={'pt-3'}>
                <Form.Item noStyle={true}>
                  <Select
                    mode='multiple'
                    allowClear
                    value={state.selectedAccess.filter((a) => a !== 'admin')}
                    onChange={(v) => {
                      setState({
                        selectedAccess: [...v, 'admin']
                      })
                    }}
                    options={state.access
                      .filter((a) => a !== 'admin')
                      .map((a) => ({
                        label: accessLabelMap[a],
                        value: a
                      }))}
                    style={{ width: '100%' }}
                    placeholder='权限'
                  />
                </Form.Item>
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>
    )
  }
)
