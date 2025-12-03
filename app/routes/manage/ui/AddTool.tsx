import { useForm } from '@tanstack/react-form'
import { observer } from 'mobx-react-lite'
import { useEffect, useMemo } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select'
import { Spinner } from '~/components/ui/spinner'
import { Textarea } from '~/components/ui/textarea'
import googleIcon from '~/assets/google.png'
import exaIcon from '~/assets/exa.png'
import tavilyIcon from '~/assets/tavily.png'
import { Switch } from '~/components/ui/switch'
import CodeEditor from '~/components/project/Code'
import bochaIcon from '~/assets/bocha.png'
import zhipuIcon from '~/assets/zhipu.png'
import { toast } from 'sonner'

const httpJsonSchema = z.object({
  url: z.url({ error: '请填写正确的请求URL' }),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], {
    error: '请填写正确的请求方法'
  }),
  headers: z
    .record(z.string(), z.string(), { error: '请填写正确的请求头' })
    .optional(),
  params: z
    .record(z.string(), z.any(), { error: '请填写正确的请求参数' })
    .optional(),
  input: z
    .object({
      key: z.string({ error: '请填写Input参数中的key值' }),
      type: z.enum(['string', 'number'], { error: '请填写正确的请求输入类型' }),
      describe: z.string({ error: '请填写正确的请求输入描述' })
    })
    .array()
    .optional()
})

const searchModes = [
  {
    value: 'zhipu',
    label: '智谱搜索',
    icon: zhipuIcon
  },
  {
    value: 'bocha',
    label: '博查搜索',
    icon: bochaIcon
  },
  {
    value: 'google',
    label: 'Google',
    icon: googleIcon
  },
  {
    value: 'tavily',
    label: 'Tavily',
    icon: tavilyIcon
  },
  {
    value: 'exa',
    label: 'Exa',
    icon: exaIcon
  }
]

const useTexts = () => {
  return useMemo(
    () => ({
      http_desc: '准确描述HTTP工具的作用',
      web_search_desc:
        '通过搜索引擎获取最新网页内容，用于补充或验证模型的知识。如果你认为需要最新的信息来回答用户的问题，请使用此工具。',
      http_json: `{
  "url": "https://example.com",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer <your_api_key>"
  },
  "params": {"field": "value"},
  "input": [
    {
      "key": "string",
      "type": "string", 
      "describe": "描述"
    }, 
    {
      "key": "string",
      "type": "number", 
      "describe": "描述"
    }
  ]
}`
    }),
    []
  )
}
export const AddTool = observer(
  (props: {
    open: boolean
    id?: string
    onClose: () => void
    onUpdate: () => void
  }) => {
    const texts = useTexts()
    const form = useForm({
      defaultValues: {
        name: '',
        description: '',
        type: 'http',
        auto: true,
        id: '',
        params: {
          http: texts.http_json
        } as Record<string, any>
      },
      onSubmit: async ({ value }) => {
        try {
          if (value.type === 'web_search') {
            await trpc.manage.connectSearch.mutate(value.params as any)
          }
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
              id: value.id,
              auto: value.auto,
              params: value.params,
              type: value.type as 'web_search' | 'http'
            })
          }
        } catch (e: any) {
          toast.error(e.message)
          return
        }

        props.onUpdate()
        props.onClose()
      }
    })
    useEffect(() => {
      if (props.open) {
        form.reset()
        form.setFieldValue('description', texts.http_desc)
        if (props.id) {
          trpc.manage.getTool.query(props.id).then((res) => {
            if (res) {
              form.reset({
                name: res.name,
                description: res.description,
                params: res.params,
                type: res.type,
                id: res.id,
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
                  name={'id'}
                  validators={{
                    onSubmit: ({ value }) => {
                      if (!value) {
                        return { message: '请输入工具ID' }
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
                            '工具ID是工具的唯一标识，只能包含小写字母和下划线。例如: web_search, 工具一旦创建，ID不可更改。'
                          }
                        >
                          ID{' '}
                        </FieldLabel>
                        <Input
                          maxLength={50}
                          id={field.name}
                          name={field.name}
                          disabled={!!props.id}
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
                  name={'name'}
                  validators={{
                    onSubmit: ({ value }) => {
                      if (!value) {
                        return { message: '请输入工具名称' }
                      }
                      if (value.length > 20) {
                        return {
                          message: '工具名称应在20个字符以内'
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
                          help={'当工具被调用时，工具名将显示在对话界面中。'}
                        >
                          名称{' '}
                        </FieldLabel>
                        <Input
                          maxLength={20}
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder='工具名称应在20个字符以内'
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
                  name={'type'}
                  children={(field) => {
                    return (
                      <Field>
                        <FieldLabel htmlFor={field.name} required>
                          工具类型
                        </FieldLabel>
                        <RadioGroup
                          value={field.state.value}
                          disabled={!!props.id}
                          onValueChange={(value) => {
                            field.setValue(value)
                            if (value === 'http') {
                              form.setFieldValue('params', {
                                http: texts.http_json
                              })
                              form.setFieldValue('description', texts.http_desc)
                            } else {
                              form.setFieldValue('params', {})
                              form.setFieldValue(
                                'description',
                                texts.web_search_desc
                              )
                            }
                          }}
                        >
                          <div className='flex items-center gap-3'>
                            <RadioGroupItem value='http' id='r2' />
                            <Label htmlFor='r2'>HTTP请求</Label>
                          </div>
                          <div className='flex items-center gap-3'>
                            <RadioGroupItem value='web_search' id='r1' />
                            <Label htmlFor='r1'>网络搜索</Label>
                          </div>
                        </RadioGroup>
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
                            '开启后，工具不会显示在对话菜单栏中，模型将根据工具描述与用户提问，自动选择是否使用该工具。若未开启，则需要成员对话时手动添加该工具调用。'
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
                            validators={{
                              onSubmit: ({ value }) => {
                                if (!value) {
                                  return { message: '请选择搜索模式' }
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
                                  <FieldLabel
                                    htmlFor={field.name}
                                    required={true}
                                  >
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
                                      {searchModes.map((mode) => (
                                        <SelectItem
                                          key={mode.value}
                                          value={mode.value}
                                        >
                                          <div
                                            className={
                                              'flex items-center gap-1.5'
                                            }
                                          >
                                            <img
                                              src={mode.icon}
                                              className={'size-4'}
                                            />
                                            {mode.label}
                                          </div>
                                        </SelectItem>
                                      ))}
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
                      {type === 'http' && (
                        <form.Field
                          name='params.http'
                          validators={{
                            onSubmit: ({ value }) => {
                              let data: Record<string, any> = {}
                              console.log('value', value)

                              try {
                                data = JSON.parse(value)
                              } catch {
                                return { message: '请输入正确的json格式' }
                              }
                              try {
                                httpJsonSchema.parse(data)
                              } catch (e) {
                                if (e instanceof z.ZodError) {
                                  console.log('1')

                                  return { message: e.issues[0].message }
                                }
                              }
                              return undefined
                            }
                          }}
                          children={(field) => {
                            const isInvalid =
                              field.state.meta.isTouched &&
                              !field.state.meta.isValid
                            return (
                              <Field>
                                <FieldLabel
                                  htmlFor={field.name}
                                  required
                                  help={`url和method是必填项，其他参数为可选，\n如果为POST请求，将以Application/json格式发送body参数。\n如果希望大模型在请求时加入动态参数，请填写input参数，参数将附加在params中， \ninput参数仅支持number和string类型，请准确填写参数描述以让大模型理解参数含义。`}
                                >
                                  请求参数
                                </FieldLabel>
                                <CodeEditor
                                  language={'json'}
                                  height={'336px'}
                                  value={field.state.value}
                                  onChange={(value) =>
                                    field.handleChange(value)
                                  }
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
