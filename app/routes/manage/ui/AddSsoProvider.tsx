import { useForm } from '@tanstack/react-form'
import { Form, Input, Modal, Switch } from 'antd'
import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { trpc } from '~/.client/trpc'

export const AddSsoProvider = observer(
  (props: {
    open: boolean
    id: number | null
    onClose: () => void
    onUpdate: () => void
  }) => {
    const [form] = Form.useForm()
    useEffect(() => {
      if (props.open) {
        form.resetFields()
        if (props.id) {
          trpc.manage.getAuthProvider.query(props.id).then((res) => {
            if (res) {
              form.setFieldsValue({
                name: res.name,
                // issuer: res.issuer,
                auth_url: res.authUrl,
                token_url: res.tokenUrl,
                userinfo_url: res.userinfoUrl || '',
                // jwks_uri: res.jwks_uri,
                client_id: res.clientId,
                client_secret: res.clientSecret || '',
                scopes: res.scopes || '',
                use_pkce: res.usePkce
              })
            }
          })
        }
      }
    }, [props.open, props.id])
    return (
      <Modal
        open={props.open}
        onCancel={() => {
          props.onClose()
        }}
        title={props.id ? '编辑SSO提供者' : '添加SSO提供者'}
        onOk={() => {
          return form.validateFields().then(async (value) => {
            if (props.id) {
              await trpc.manage.updateAuthProvider.mutate({
                id: props.id,
                data: {
                  name: value.name,
                  auth_url: value.auth_url,
                  token_url: value.token_url,
                  userinfo_url: value.userinfo_url,
                  client_id: value.client_id,
                  client_secret: value.client_secret,
                  scopes: value.scopes,
                  use_pkce: value.use_pkce
                }
              })
            } else {
              await trpc.manage.createAuthProvider.mutate({
                name: value.name,
                auth_url: value.auth_url,
                token_url: value.token_url,
                userinfo_url: value.userinfo_url,
                client_id: value.client_id,
                client_secret: value.client_secret,
                scopes: value.scopes,
                use_pkce: value.use_pkce
              })
            }
            props.onUpdate()
            props.onClose()
          })
        }}
        width={450}
      >
        <Form form={form} layout='vertical' className={'pt-2'}>
          <Form.Item
            name='name'
            label='名称'
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder={'请输入名称'} />
          </Form.Item>
          <Form.Item
            name='auth_url'
            label='授权URL'
            tooltip={'授权URL是第三方系统授权的URL。'}
            rules={[
              { required: true, message: '请输入有效授权URL', type: 'url' }
            ]}
          >
            <Input placeholder={'请输入授权URL'} />
          </Form.Item>
          <Form.Item
            name='token_url'
            label='令牌URL'
            tooltip={'获取access_token的URL。'}
            rules={[
              { required: true, message: '请输入有效令牌URL', type: 'url' }
            ]}
          >
            <Input placeholder={'请输入令牌URL'} />
          </Form.Item>
          <Form.Item
            name='userinfo_url'
            label='用户信息URL'
            tooltip={'获取用户信息的URL。'}
            rules={[
              { required: true, message: '请输入有效用户信息URL', type: 'url' }
            ]}
          >
            <Input placeholder={'请输入用户信息URL'} />
          </Form.Item>
          <Form.Item
            name='client_id'
            label='客户端ID'
            rules={[{ required: true, message: '请输入客户端ID' }]}
          >
            <Input placeholder={'请输入客户端ID'} />
          </Form.Item>
          <Form.Item
            name='client_secret'
            label='客户端密钥'
            rules={[{ required: true, message: '请输入客户端密钥' }]}
          >
            <Input placeholder={'请输入客户端密钥'} />
          </Form.Item>
          <Form.Item
            name='use_pkce'
            tooltip={'使用PKCE增强安全校验。'}
            label='使用PKCE'
            valuePropName={'checked'}
            initialValue={false}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    )
  }
)
