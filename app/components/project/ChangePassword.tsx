import { observer } from 'mobx-react-lite'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '../ui/field'
import { Input } from '../ui/input'
import { useForm } from '@tanstack/react-form'
import { Button } from '../ui/button'
import { trpc } from '~/.client/trpc'
import { useLocalState } from '~/hooks/localState'
import { Spinner } from '../ui/spinner'
import { toast } from 'sonner'

export const ChangePassword = observer(
  (props: { open: boolean; onClose: () => void }) => {
    const [state, setState] = useLocalState({
      submitting: false
    })
    const form = useForm({
      defaultValues: {
        oldPassword: '',
        password: '',
        repassowrd: ''
      },
      onSubmit: async ({ value }) => {
        setState({ submitting: true })
        await trpc.common.changePassword
          .mutate({
            oldPassword: value.oldPassword || undefined,
            password: value.password,
            repassowrd: value.repassowrd
          })
          .then(() => {
            props.onClose()
          })
          .catch((e: any) => {
            toast.error(e.message)
          })
          .finally(() => {
            setState({ submitting: false })
          })
      }
    })
    return (
      <Dialog
        open={props.open}
        onOpenChange={(open) => {
          if (!open) {
            props.onClose()
          }
        }}
      >
        <DialogContent className={'w-96'}>
          <DialogHeader>
            <DialogTitle>变更登录密码</DialogTitle>
          </DialogHeader>
          <div className={'p-4'}>
            <form>
              <FieldGroup>
                <form.Field
                  name={'oldPassword'}
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel
                          htmlFor={field.name}
                          help={'如果未设置登录密码，无需填写'}
                        >
                          原密码
                        </FieldLabel>
                        <Input
                          maxLength={200}
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          type={'password'}
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
                  name={'password'}
                  validators={{
                    onSubmit: ({ value }) => {
                      if (!value) {
                        return { message: '请输入6-30位的密码' }
                      }
                      if (value.length < 6 || value.length > 30) {
                        return { message: '请输入6-30位的密码' }
                      }
                      return undefined
                    }
                  }}
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name} required={true}>
                          新原密码
                        </FieldLabel>
                        <Input
                          maxLength={200}
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          type={'password'}
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
                  name={'repassowrd'}
                  validators={{
                    onSubmit: ({ value, fieldApi }) => {
                      if (!value) {
                        return { message: '请输入6-30位的密码' }
                      }
                      if (value.length < 6 || value.length > 30) {
                        return { message: '请输入6-30位的密码' }
                      }
                      if (value !== fieldApi.form.getFieldValue('password')) {
                        return { message: '两次输入的密码不一致' }
                      }
                      return undefined
                    }
                  }}
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name} required={true}>
                          重复新密码
                        </FieldLabel>
                        <Input
                          maxLength={200}
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          type={'password'}
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
                <Button
                  className={'w-full'}
                  disabled={state.submitting}
                  onClick={(e) => {
                    e.preventDefault()
                    form.handleSubmit()
                  }}
                >
                  {state.submitting && <Spinner />}
                  确认
                </Button>
              </FieldGroup>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    )
  }
)
