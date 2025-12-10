import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { trpc } from '~/.client/trpc'
import { useLocalState } from '~/hooks/localState'
import { Form, Input, Modal, Select } from 'antd'

export const AddMember = observer(
  (props: {
    open: boolean
    id?: number
    onClose: () => void
    onUpdate: () => void
  }) => {
    const [state, setState] = useLocalState({
      roles: [] as { value: number; label: string }[]
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
        onOk={() => {
          return form.validateFields().then(async (value) => {
            console.log('value', value)
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
          })
        }}
        onCancel={() => {
          props.onClose()
        }}
      >
        <Form form={form} layout={'vertical'} validateTrigger={'submit'}>
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
        {/* <div className={'modal-content'}>
          <form>
            <FieldGroup>
              <form.Field
                name={'name'}
                validators={{
                  onSubmit: ({ value }) => {
                    if (!value) {
                      return { message: '请输入名称' }
                    }
                    return undefined
                  }
                }}
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name} required>
                        名称
                      </FieldLabel>
                      <Input
                        maxLength={200}
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder='输入名称'
                        autoComplete='off'
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  )
                }}
              />
              <form.Field
                name={'email'}
                validators={{
                  onSubmit: ({ value }) => {
                    if (!value) {
                      return undefined
                    }
                    const emailSchema = z.email()
                    try {
                      emailSchema.parse(value)
                      return undefined
                    } catch {
                      return { message: '请输入正确的邮箱' }
                    }
                  }
                }}
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                      <Input
                        maxLength={200}
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder='输入邮箱'
                        autoComplete='off'
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  )
                }}
              />
              <form.Field
                name={'roles'}
                key={JSON.stringify(state.roles)}
                validators={{
                  onSubmit: ({ value, fieldApi }) => {
                    if (!value.length) {
                      return { message: '请至少选择一个角色' }
                    }
                    return undefined
                  }
                }}
                children={(field) => {
                  return (
                    <Field>
                      <FieldLabel htmlFor={field.name} required>
                        角色
                      </FieldLabel>
                      <SelectFilter
                        options={state.roles}
                        value={field.state.value}
                        placeholder={'选择角色'}
                        onValueChange={(value) => {
                          field.setValue(value as number[])
                        }}
                        multiple={true}
                      />
                    </Field>
                  )
                }}
              />
              <form.Field
                name={'passowrd'}
                validators={{
                  onSubmit: ({ value }) => {
                    if (!value && !!props.id) return undefined
                    const schema = z.string().min(6).max(30)
                    try {
                      schema.parse(value)
                      return undefined
                    } catch (e) {
                      return { message: '请输入6-30位的密码' }
                    }
                  }
                }}
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name} required={!props.id}>
                        密码
                      </FieldLabel>
                      <Input
                        maxLength={50}
                        id={field.name}
                        type={'password'}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder='输入密码'
                        autoComplete='off'
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  )
                }}
              />
              <form.Field
                validators={{
                  onSubmit: ({ value, fieldApi }) => {
                    if (!value && !!props.id) return undefined
                    const schema = z.string().min(6).max(30)
                    try {
                      schema.parse(value)
                      const password = fieldApi.form.getFieldValue('passowrd')
                      if (value !== password) {
                        return { message: '两次密码不一致' }
                      }
                      return undefined
                    } catch {
                      return { message: '请输入6-30位的密码' }
                    }
                  }
                }}
                name={'rePassword'}
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name} required={!props.id}>
                        重复密码
                      </FieldLabel>
                      <Input
                        maxLength={200}
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder='输入重复密码'
                        type={'password'}
                        autoComplete='off'
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  )
                }}
              />
            </FieldGroup>
          </form>
        </div>
        <form.Subscribe
          selector={(state) => state.isSubmitting}
          children={(isSubmitting) => (
            <DialogFooter>
              <DialogClose asChild>
                <Button variant='outline'>取消</Button>
              </DialogClose>
              <Button
                disabled={isSubmitting}
                onClick={() => {
                  form.handleSubmit()
                }}
              >
                {isSubmitting && <Spinner />}
                添加
              </Button>
            </DialogFooter>
          )}
        /> */}
      </Modal>
    )
  }
)
