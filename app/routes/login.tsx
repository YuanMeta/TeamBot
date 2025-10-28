import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { observer } from 'mobx-react-lite'
import { useForm } from '@tanstack/react-form'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel
} from '~/components/ui/field'
import { Spinner } from '~/components/ui/spinner'
import { ModelIcon } from '~/lib/ModelIcon'
import { trpc } from '~/.client/trpc'
import { toast } from 'sonner'
import { getTrpcErrorMessage } from '~/lib/utils'
import { useNavigate } from 'react-router'

export default observer(() => {
  const navigate = useNavigate()
  const form = useForm({
    defaultValues: {
      nameOrEmail: '',
      password: ''
    },
    onSubmit: async ({ value }) => {
      console.log(value)
      try {
        const res = await fetch('/api/api-login', {
          method: 'POST',
          body: JSON.stringify({
            nameOrEmail: value.nameOrEmail,
            password: value.password
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        })
        if (res.ok) {
          navigate('/chat', { replace: true })
        } else {
          const text = await res.text()
          if (text) {
            toast.error(text)
          }
        }
      } catch (e: any) {
        toast.error(e.message || '未知错误')
      }
    }
  })
  return (
    <div className={'login-page dark'}>
      <div className={'stars'}></div>
      <div className={'stars2'}></div>
      <div className={'stars3'}></div>
      <div
        className={
          'flex flex-col items-center justify-center h-full relative z-10'
        }
      >
        <div className={'-mt-32'}>
          <div className={'flex items-center justify-center mb-5 gap-3'}>
            <ModelIcon mode={'deepseek'} size={42} />
            <div className={'title'}>
              <span>Team Bot</span>
            </div>
          </div>
          <Card className='w-96 max-w-sm'>
            <CardHeader>
              <CardTitle>登录到你的账户</CardTitle>
              <CardDescription>
                输入你的邮箱或用户名来登录你的账户
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form>
                <FieldGroup>
                  <form.Field
                    name='nameOrEmail'
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
                            用户名或邮箱
                          </FieldLabel>
                          <Input
                            maxLength={50}
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
                    name='password'
                    validators={{
                      onSubmit: ({ value }) => {
                        if (!value) {
                          return { message: '请输入密码' }
                        }
                        if (value.length < 6) {
                          return { message: '请输入6位以上的密码' }
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
                            密码
                          </FieldLabel>
                          <Input
                            maxLength={50}
                            type={'password'}
                            id={field.name}
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
                </FieldGroup>
              </form>
            </CardContent>
            <form.Subscribe
              selector={(state) => [state.isSubmitting]}
              children={([isSubmitting]) => (
                <CardFooter className='flex-col gap-3'>
                  <Button
                    type='submit'
                    className='w-full'
                    disabled={isSubmitting}
                    onClick={() => {
                      form.handleSubmit()
                    }}
                  >
                    {isSubmitting && <Spinner />}
                    登录
                  </Button>
                  <Button
                    variant='outline'
                    className='w-full'
                    disabled={isSubmitting}
                  >
                    通过Google登录
                  </Button>
                </CardFooter>
              )}
            />
          </Card>
        </div>
      </div>
    </div>
  )
})
