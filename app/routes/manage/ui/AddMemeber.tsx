import { useForm } from '@tanstack/react-form'
import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import z from 'zod'
import { trpc } from '~/.client/trpc'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import {
  FieldGroup,
  FieldLabel,
  Field,
  FieldError
} from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { Spinner } from '~/components/ui/spinner'
import { useLocalState } from '~/hooks/localState'
import { sleep } from '~/lib/utils'

export const AddMember = observer(
  (props: {
    open: boolean
    id?: string
    onClose: () => void
    onUpdate: () => void
  }) => {
    const form = useForm({
      defaultValues: {
        name: '',
        email: '',
        passowrd: '',
        rePassword: '',
        role: 'member'
      },
      onSubmit: async ({ value }) => {
        if (props.id) {
          await trpc.manage.updateMember.mutate({
            userId: props.id,
            email: value.email || undefined,
            password: value.passowrd,
            name: value.name,
            role: value.role as 'admin' | 'member'
          })
        } else {
          await trpc.manage.createMember.mutate({
            email: value.email || undefined,
            password: value.passowrd,
            name: value.name,
            role: value.role as 'admin' | 'member'
          })
        }
        props.onUpdate()
        props.onClose()
      }
    })
    useEffect(() => {
      if (props.open) {
        form.reset()
        if (props.id) {
          trpc.manage.getMember.query(props.id).then((res) => {
            if (res) {
              form.reset({
                email: res.email || '',
                name: res.name || '',
                role: res.role as 'admin' | 'member',
                passowrd: '',
                rePassword: ''
              })
            }
          })
        }
      }
    }, [props.open, props.id])
    return (
      <Dialog
        open={props.open}
        onOpenChange={(open) => {
          if (!open) {
            props.onClose()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加成员</DialogTitle>
            <DialogDescription>
              添加成员共享对话和知识库，建议使用SSO接入已有成员。
            </DialogDescription>
          </DialogHeader>
          <div className={'modal-content'}>
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
                  name={'role'}
                  children={(field) => {
                    return (
                      <Field>
                        <FieldLabel htmlFor={field.name} required>
                          角色
                        </FieldLabel>
                        <RadioGroup
                          value={field.state.value}
                          onValueChange={(value) => field.setValue(value)}
                        >
                          <div className='flex items-center gap-3'>
                            <RadioGroupItem value='member' id='r1' />
                            <Label htmlFor='r1'>成员</Label>
                          </div>
                          <div className='flex items-center gap-3'>
                            <RadioGroupItem value='admin' id='r2' />
                            <Label htmlFor='r2'>管理员</Label>
                          </div>
                        </RadioGroup>
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
          />
        </DialogContent>
      </Dialog>
    )
  }
)
