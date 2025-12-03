import { useForm } from '@tanstack/react-form'
import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
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
import { Spinner } from '~/components/ui/spinner'
import { Switch } from '~/components/ui/switch'

export const AddSsoProvider = observer(
  (props: {
    open: boolean
    id: number | null
    onClose: () => void
    onUpdate: () => void
  }) => {
    const form = useForm({
      defaultValues: {
        name: '',
        auth_url: '',
        token_url: '',
        userinfo_url: '',
        client_id: '',
        client_secret: '',
        scopes: '',
        use_pkce: false
      },
      onSubmit: async ({ value }) => {
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
      }
    })
    useEffect(() => {
      if (props.open) {
        form.reset()
        if (props.id) {
          trpc.manage.getAuthProvider.query(props.id).then((res) => {
            if (res) {
              form.reset({
                name: res.name,
                // issuer: res.issuer,
                auth_url: res.auth_url,
                token_url: res.token_url,
                userinfo_url: res.userinfo_url,
                // jwks_uri: res.jwks_uri,
                client_id: res.client_id,
                client_secret: res.client_secret,
                scopes: res.scopes,
                use_pkce: res.use_pkce
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
            <DialogTitle>添加SSO提供者</DialogTitle>
            <DialogDescription>
              添加SSO提供者让成员可通过第三方系统登录。
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
                          maxLength={50}
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
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
                  name={'auth_url'}
                  validators={{
                    onSubmit: ({ value }) => {
                      if (!value) {
                        return { message: '请输入授权URL' }
                      }
                      if (!/^https?:\/\/.+/i.test(value)) {
                        return { message: '请输入有效的 http(s) 地址' }
                      }
                      return undefined
                    }
                  }}
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel
                          htmlFor={field.name}
                          required
                          help={'授权URL是第三方系统授权的URL。'}
                        >
                          授权URL
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder='https://example.com/auth'
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
                  name={'token_url'}
                  validators={{
                    onSubmit: ({ value }) => {
                      if (!value) {
                        return { message: '请输入令牌URL' }
                      }
                      if (!/^https?:\/\/.+/i.test(value)) {
                        return { message: '请输入有效的 http(s) 地址' }
                      }
                      return undefined
                    }
                  }}
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel
                          htmlFor={field.name}
                          required={true}
                          help={'获取access_token的URL。'}
                        >
                          令牌URL
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder='https://example.com/access_token'
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
                  name={'userinfo_url'}
                  validators={{
                    onSubmit: ({ value }) => {
                      if (!value) {
                        return { message: '请输入用户信息URL' }
                      }
                      if (!/^https?:\/\/.+/i.test(value)) {
                        return { message: '请输入有效的 http(s) 地址' }
                      }
                      return undefined
                    }
                  }}
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel
                          htmlFor={field.name}
                          required={true}
                          help={'获取用户信息的URL。'}
                        >
                          用户信息URL
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder='https://example.com/userinfo'
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
                  name={'client_id'}
                  validators={{
                    onSubmit: ({ value }) => {
                      if (!value) {
                        return { message: '请输入客户端ID' }
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
                          Client ID
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          autoComplete='off'
                          placeholder={'输入客户端ID'}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                />
                <form.Field
                  name={'client_secret'}
                  validators={{
                    onSubmit: ({ value }) => {
                      if (!value) {
                        return { message: '请输入客户端密钥' }
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
                          Client Secret
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder={'输入客户端密钥'}
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
                  name={'use_pkce'}
                  children={(field) => {
                    return (
                      <Field>
                        <FieldLabel
                          htmlFor={field.name}
                          required={true}
                          help={'使用PKCE增强安全校验。'}
                        >
                          使用PKCE
                        </FieldLabel>
                        <div>
                          <Switch
                            checked={field.state.value}
                            onCheckedChange={(checked) => {
                              field.setValue(checked ? true : false)
                            }}
                          />
                        </div>
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
                  {props.id ? '更新' : '添加'}
                </Button>
              </DialogFooter>
            )}
          />
        </DialogContent>
      </Dialog>
    )
  }
)
