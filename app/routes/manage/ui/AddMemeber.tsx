import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { trpc } from '~/.client/trpc'
import { useLocalState } from '~/hooks/localState'
import { Form, Input, Modal, Select } from 'antd'
import { toast } from 'sonner'

export const AddMember = observer(
  (props: {
    open: boolean
    id?: number
    onClose: () => void
    onUpdate: () => void
  }) => {
    const [state, setState] = useLocalState({
      roles: [] as { value: number; label: string }[],
      submitting: false
    })
    const [form] = Form.useForm()
    useEffect(() => {
      if (props.open) {
        form.resetFields()
        if (props.id) {
          trpc.manage.getMember.query({ id: props.id }).then((res) => {
            if (res) {
              form.setFieldsValue({
                email: res.email || '',
                name: res.name || '',
                passowrd: '',
                rePassword: '',
                roles: res.roles.map((r) => r.id)
              })
            }
          })
        }
        trpc.manage.getRoles.query({ page: 1, pageSize: 1000 }).then((res) => {
          setState({
            roles: res.list.map((r) => ({ value: r.id, label: r.name }))
          })
        })
      }
    }, [props.open, props.id])
    return (
      <Modal
        open={props.open}
        title={props.id ? '编辑成员' : '添加成员'}
        width={450}
        confirmLoading={state.submitting}
        onOk={() => {
          form.validateFields().then(async (value) => {
            setState({ submitting: true })
            try {
              if (props.id) {
                await trpc.manage.updateMember.mutate({
                  userId: props.id,
                  email: value.email || undefined,
                  password: value.passowrd || undefined,
                  name: value.name,
                  roles: value.roles
                })
              } else {
                await trpc.manage.createMember.mutate({
                  email: value.email || undefined,
                  password: value.passowrd,
                  name: value.name,
                  roles: value.roles
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
            name={'email'}
            label={'邮箱'}
            rules={[
              { required: false, message: '请输入正确邮箱', type: 'email' }
            ]}
          >
            <Input placeholder='请输入邮箱' />
          </Form.Item>
          <Form.Item
            name={'roles'}
            label={'角色'}
            rules={[{ required: true, message: '请选择角色', type: 'array' }]}
          >
            <Select
              mode={'multiple'}
              options={state.roles}
              placeholder={'选择角色'}
            />
          </Form.Item>
          <Form.Item
            name={'passowrd'}
            label={'密码'}
            tooltip={'修改信息时，若不希望修改密码，请不要填写'}
            rules={[
              {
                required: props.id ? false : true,
                message: '请输入6-30位密码',
                min: 6,
                max: 30
              }
            ]}
          >
            <Input placeholder='请输入密码' />
          </Form.Item>
          <Form.Item
            name={'rePassword'}
            label={'重复密码'}
            rules={[
              {
                required: props.id ? false : true,
                message: '请输入重复密码',
                min: 6,
                max: 30
              },
              {
                validator: (_, value) => {
                  if (value !== form.getFieldValue('passowrd')) {
                    return Promise.reject(new Error('两次密码不一致'))
                  }
                  return Promise.resolve()
                }
              }
            ]}
          >
            <Input placeholder='请输入重复密码' />
          </Form.Item>
        </Form>
      </Modal>
    )
  }
)
