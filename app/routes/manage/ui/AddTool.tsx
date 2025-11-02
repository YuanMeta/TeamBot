import { useForm } from '@tanstack/react-form'
import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import z from 'zod'
import { trpc } from '~/.client/trpc'
import { TextHelp } from '~/components/project/text-help'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select'
import { Spinner } from '~/components/ui/spinner'
import { Textarea } from '~/components/ui/textarea'
import { useLocalState } from '~/hooks/localState'
import googleIcon from '~/assets/google.png'
import exaIcon from '~/assets/exa.png'
import tavilyIcon from '~/assets/tavily.png'
import { Switch } from '~/components/ui/switch'
export const AddTool = observer(
  (props: {
    open: boolean
    id?: string
    onClose: () => void
    onUpdate: () => void
  }) => {
    const form = useForm({
      defaultValues: {
        name: '',
        description: '',
        type: 'web_search',
        auto: true,
        params: {} as Record<string, any>
      },
      onSubmit: async ({ value }) => {
        if (props.id) {
          await trpc.manage.updateTool.mutate({
            id: props.id,
            data: {
              description: value.description,
              name: value.name,
              params: value.params,
              auto: value.auto,
              type: value.type as 'web_search' | 'http'
            }
          })
        } else {
          await trpc.manage.createTool.mutate({
            description: value.description,
            name: value.name,
            auto: value.auto,
            params: value.params,
            type: value.type as 'web_search' | 'http'
          })
        }
        props.onUpdate()
        props.onClose()
      }
    })
    useEffect(() => {
      if (props.open) {
        form.reset()
        form.setFieldValue(
          'description',
          '通过搜索引擎获取最新网页内容，用于补充或验证模型的知识。如果你认为需要最新的信息来回答用户的问题，请使用此工具。'
        )
        if (props.id) {
          trpc.manage.getTool.query(props.id).then((res) => {
            if (res) {
              form.reset({
                name: res.name,
                description: res.description,
                params: res.params,
                type: res.type,
                auto: res.auto
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
            <DialogTitle>添加工具</DialogTitle>
            <DialogDescription>
              添加工具让模型使用外部数据源。
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
                        return { message: '请输入工具名称' }
                      }
                      if (!/^[a-zA-Z_]+$/.test(value)) {
                        return {
                          message: '工具名称只能包含小写字母、数字和下划线'
                        }
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
                          help={
                            '工具名称是工具的唯一标识，只能包含小写字母和下划线。例如: web_search'
                          }
                        >
                          名称{' '}
                        </FieldLabel>
                        <Input
                          maxLength={50}
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder='由小写字母和下划线组成'
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
                  name={'description'}
                  validators={{
                    onSubmit: ({ value }) => {
                      if (!value) {
                        return { message: '请输入工具描述' }
                      }
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
                          help={
                            '工具描述是帮助模型理解工具用途的方法，模型将根据描述选择是否使用该工具。\n描述应该简洁明了，尽量不要超过200个字符。'
                          }
                        >
                          工具描述{' '}
                        </FieldLabel>
                        <Textarea
                          id={field.name}
                          maxLength={300}
                          name={field.name}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder='输入工具描述'
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                />
                <form.Field
                  name={'auto'}
                  children={(field) => {
                    return (
                      <Field>
                        <FieldLabel
                          htmlFor={field.name}
                          required={true}
                          help={
                            '模型将根据工具描述与用户提问，自动选择是否使用该工具。'
                          }
                        >
                          自动调用{' '}
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
                <form.Field
                  name={'type'}
                  children={(field) => {
                    return (
                      <Field>
                        <FieldLabel htmlFor={field.name} required>
                          工具类型
                        </FieldLabel>
                        <RadioGroup
                          value={field.state.value}
                          onValueChange={(value) => field.setValue(value)}
                        >
                          <div className='flex items-center gap-3'>
                            <RadioGroupItem value='web_search' id='r1' />
                            <Label htmlFor='r1'>网络搜索</Label>
                          </div>
                          <div className='flex items-center gap-3'>
                            <RadioGroupItem value='http' id='r2' />
                            <Label htmlFor='r2'>HTTP请求</Label>
                          </div>
                        </RadioGroup>
                      </Field>
                    )
                  }}
                />
                <form.Subscribe
                  selector={(state) => [
                    state.values.type,
                    state.values.params.mode
                  ]}
                  children={([type, mode]) => (
                    <>
                      {type === 'web_search' && (
                        <>
                          <form.Field
                            name={'params.mode'}
                            children={(field) => {
                              const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid
                              return (
                                <Field data-invalid={isInvalid}>
                                  <FieldLabel htmlFor={field.name}>
                                    网络搜索模式
                                  </FieldLabel>
                                  <Select
                                    value={field.state.value}
                                    onValueChange={(value) => {
                                      field.setValue(value as any)
                                    }}
                                  >
                                    <SelectTrigger className={'w-full'}>
                                      <SelectValue placeholder='选择搜索模式' />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={'tavily'}>
                                        <div
                                          className={
                                            'flex items-center gap-1.5'
                                          }
                                        >
                                          <img
                                            src={tavilyIcon}
                                            className={'size-4'}
                                          />
                                          Tavily
                                        </div>
                                      </SelectItem>
                                      <SelectItem value={'google'}>
                                        <div
                                          className={
                                            'flex items-center gap-1.5'
                                          }
                                        >
                                          <img
                                            src={googleIcon}
                                            className={'size-4'}
                                          />
                                          Google
                                        </div>
                                      </SelectItem>
                                      <SelectItem value={'exa'}>
                                        <div
                                          className={
                                            'flex items-center gap-1.5'
                                          }
                                        >
                                          <img
                                            src={exaIcon}
                                            className={'size-4'}
                                          />
                                          Exa
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {isInvalid && (
                                    <FieldError
                                      errors={field.state.meta.errors}
                                    />
                                  )}
                                </Field>
                              )
                            }}
                          />
                          <form.Field
                            name='params.apiKey'
                            validators={{
                              onSubmit: ({ value }) => {
                                if (!value) {
                                  return { message: '请输入API Key' }
                                }
                                return undefined
                              }
                            }}
                            children={(field) => {
                              const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid
                              return (
                                <Field data-invalid={isInvalid}>
                                  <FieldLabel htmlFor={field.name} required>
                                    Api Key
                                  </FieldLabel>
                                  <Input
                                    maxLength={200}
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    type={'password'}
                                    onBlur={field.handleBlur}
                                    onChange={(e) =>
                                      field.handleChange(e.target.value)
                                    }
                                    aria-invalid={isInvalid}
                                    placeholder='输入Api Key'
                                    autoComplete='off'
                                  />
                                  {isInvalid && (
                                    <FieldError
                                      errors={field.state.meta.errors}
                                    />
                                  )}
                                </Field>
                              )
                            }}
                          />
                          {mode === 'google' && (
                            <form.Field
                              name='params.cseId'
                              validators={{
                                onSubmit: ({ value }) => {
                                  if (!value) {
                                    return { message: '请输入CSEId' }
                                  }
                                  return undefined
                                }
                              }}
                              children={(field) => {
                                const isInvalid =
                                  field.state.meta.isTouched &&
                                  !field.state.meta.isValid
                                return (
                                  <Field data-invalid={isInvalid}>
                                    <FieldLabel htmlFor={field.name} required>
                                      CSEId
                                    </FieldLabel>
                                    <Input
                                      maxLength={200}
                                      id={field.name}
                                      name={field.name}
                                      value={field.state.value}
                                      onBlur={field.handleBlur}
                                      onChange={(e) =>
                                        field.handleChange(e.target.value)
                                      }
                                      aria-invalid={isInvalid}
                                      placeholder='输入CSEId'
                                      autoComplete='off'
                                    />
                                    {isInvalid && (
                                      <FieldError
                                        errors={field.state.meta.errors}
                                      />
                                    )}
                                  </Field>
                                )
                              }}
                            />
                          )}
                        </>
                      )}
                    </>
                  )}
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
