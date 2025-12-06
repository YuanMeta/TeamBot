import { useForm } from '@tanstack/react-form'
import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import { trpc } from '~/.client/trpc'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
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
import { SelectFilter } from '~/components/project/select-filter'
import { Spinner } from '~/components/ui/spinner'
import { Textarea } from '~/components/ui/textarea'
import { useLocalState } from '~/hooks/localState'

const accessLabelMap: Record<string, string> = {
  manageAssistant: '管理助手',
  viewAssistantUsage: '查看助手Token用量',
  manageMember: '管理成员',
  manageRole: '管理角色',
  manageSso: '管理SSO第三方登录',
  manageTools: '管理模型工具'
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
      assistants: [] as { id: number; name: string }[]
    })
    const form = useForm({
      defaultValues: {
        name: '',
        remark: '',
        assistants: [0] as number[],
        access: [] as string[]
      },
      onSubmit: async ({ value }) => {
        if (props.id) {
          await trpc.manage.updateRole.mutate({
            id: props.id,
            data: {
              name: value.name,
              remark: value.remark,
              access: value.access,
              assistants: value.assistants
            }
          })
        } else {
          await trpc.manage.createRole.mutate({
            name: value.name,
            remark: value.remark,
            access: value.access,
            assistants: value.assistants
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
          trpc.manage.getRole.query(props.id).then((res) => {
            if (res) {
              form.setFieldValue('access', res.access)
              form.setFieldValue('assistants', res.assistants || [])
              form.setFieldValue('name', res.name || '')
              form.setFieldValue('remark', res.remark || '')
            }
          })
        }
        trpc.manage.getAccesses.query().then((res) => {
          setState({ access: res.map((a) => a.id) })
        })
        trpc.manage.getAssistantOptions.query().then((res) => {
          setState({ assistants: [{ id: 0, name: '所有助手' }, ...res] })
        })
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
            <DialogTitle>添加角色</DialogTitle>
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
                  name={'remark'}
                  validators={{
                    onSubmit: ({ value }) => {
                      if (!value) {
                        return undefined
                      }
                    }
                  }}
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>备注</FieldLabel>
                        <Textarea
                          maxLength={200}
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder='输入备注'
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
                  name={'assistants'}
                  key={JSON.stringify(state.assistants)}
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          添加授权助手
                        </FieldLabel>
                        <SelectFilter
                          options={state.assistants.map((a) => ({
                            label: a.name,
                            value: a.id
                          }))}
                          value={field.state.value}
                          placeholder={'选择助手'}
                          onValueChange={(value) => {
                            const assistants = value as number[]
                            field.setValue(
                              assistants.includes(0) ? [0] : assistants
                            )
                          }}
                          multiple={true}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                />
                <form.Subscribe selector={(form) => [form.values.access]}>
                  {([access]) => (
                    <Field>
                      <FieldLabel help={'开启管理员权限后，成员可进入管理系统'}>
                        管理员
                      </FieldLabel>
                      <div className='flex items-center mb-2 gap-1.5'>
                        <Checkbox
                          id='admin'
                          checked={access.includes('admin')}
                          onCheckedChange={(e) => {
                            form.setFieldValue('access', e ? state.access : [])
                          }}
                        />
                        <Label htmlFor='admin'>开启管理员权限</Label>
                      </div>
                      {access.includes('admin') && (
                        <div className='flex items-center gap-3 flex-wrap'>
                          {state.access
                            .filter((a) => a !== 'admin')
                            .map((a) => (
                              <div
                                className={'flex items-center gap-1.5'}
                                key={a}
                              >
                                <Checkbox
                                  id={a}
                                  checked={access.includes(a)}
                                  onCheckedChange={(e) => {
                                    form.setFieldValue(
                                      'access',
                                      e
                                        ? [...access, a]
                                        : access.filter((item) => item !== a)
                                    )
                                  }}
                                />
                                <Label htmlFor={a}>{accessLabelMap[a]}</Label>
                              </div>
                            ))}
                        </div>
                      )}
                    </Field>
                  )}
                </form.Subscribe>
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
