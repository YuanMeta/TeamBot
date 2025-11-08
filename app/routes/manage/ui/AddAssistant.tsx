import { observer } from 'mobx-react-lite'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useForm } from '@tanstack/react-form'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel
} from '~/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select'
import { ModelIcon } from '~/lib/ModelIcon'
import { ChevronLeft, Earth, Wrench } from 'lucide-react'
import { SelectFilter } from '~/components/ui/select-filter'
import { isFormInValid } from '~/lib/utils'
import { trpc } from '~/.client/trpc'
import { useCallback, useEffect } from 'react'
import type { TrpcRequestError } from 'types'
import { toast } from 'sonner'
import { useLocalState } from '~/hooks/localState'
import { Spinner } from '~/components/ui/spinner'
import type { TableTool } from 'types/table'

export const AddAssistant = observer(
  (props: { open: boolean; onClose: () => void; id: string | null }) => {
    const [state, setState] = useLocalState({
      submitting: false,
      tools: [] as TableTool[]
    })
    const form = useForm({
      defaultValues: {
        name: '',
        mode: 'openai',
        models: [] as string[],
        api_key: null as string | null,
        base_url: null as string | null,
        options: {} as Record<string, any>,
        tools: [] as string[]
      },
      onSubmit: async ({ value }) => {
        setState({ submitting: true })
        try {
          await trpc.manage.checkConnect.mutate({
            mode: value.mode,
            models: value.models,
            api_key: value.api_key || null,
            base_url: value.base_url || null
          })
          const data = {
            mode: value.mode,
            models: value.models,
            name: value.name,
            api_key: value.api_key || null,
            base_url: value.base_url || null,
            options: {}
          }
          if (props.id) {
            await trpc.manage.updateAssistant.mutate({
              id: props.id as string,
              data,
              tools: value.tools
            })
          } else {
            await trpc.manage.createAssistant.mutate({
              data,
              tools: value.tools
            })
          }
        } catch (e) {
          const err = e as TrpcRequestError
          if (err.meta?.message) {
            toast.error(err.meta?.message, {
              duration: 5000
            })
          }
        } finally {
          setState({ submitting: false })
        }
      }
    })
    const init = useCallback(async (id: string | null) => {
      await trpc.manage.getTools
        .query({
          page: 1,
          pageSize: 1000
        })
        .then((res) => {
          setState({ tools: res.tools })
        })
      if (id) {
        trpc.manage.getAssistant.query(id as string).then((res) => {
          if (res) {
            Object.keys(res).forEach((key) => {
              form.setFieldValue(
                key as keyof typeof form.state.values,
                res[key as keyof typeof res]
              )
            })
          }
        })
      }
    }, [])
    useEffect(() => {
      init(props.id)
    }, [props.id])
    return (
      <div className={'max-w-[500px] mx-auto py-4'}>
        <Button variant={'outline'} className={'mb-5'} onClick={props.onClose}>
          <ChevronLeft />
          返回
        </Button>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field
              name='name'
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
                      // onBlur={field.handleBlur}
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
              name='mode'
              validators={{
                onSubmit: ({ value }) => {
                  if (!value) {
                    return { message: '请选择模型提供方' }
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
                      提供方
                    </FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        field.setValue(value)
                        form.setFieldValue('models', [])
                      }}
                    >
                      <SelectTrigger className={'w-full'}>
                        <SelectValue placeholder='OpenRouter' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='openrouter'>
                          <ModelIcon mode='openrouter' size={20} />
                          OpenRouter
                        </SelectItem>
                        <SelectItem value='openai'>
                          <ModelIcon mode='openai' size={20} />
                          OpenAI
                        </SelectItem>
                        <SelectItem value='gemini'>
                          <ModelIcon mode='gemini' size={20} />
                          Gemini
                        </SelectItem>
                        <SelectItem value='deepseek'>
                          <ModelIcon mode='deepseek' size={20} />
                          DeepSeek
                        </SelectItem>
                        <SelectItem value='qwen'>
                          <ModelIcon mode='qwen' size={20} />
                          Qwen
                        </SelectItem>
                        <SelectItem value='anthropic'>
                          <ModelIcon mode='anthropic' size={20} />
                          Anthropic
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            />
            <form.Field
              name='models'
              validators={{
                onSubmit: ({ value }) => {
                  if (!value.length) {
                    return { message: '请添加模型' }
                  }
                  return undefined
                }
              }}
              children={(field) => {
                return (
                  <Field>
                    <FieldLabel htmlFor={field.name} required>
                      模型
                    </FieldLabel>
                    <SelectFilter
                      options={[]}
                      value={field.state.value}
                      placeholder={'添加模型'}
                      onValueChange={(value) => {
                        field.setValue(value as string[])
                      }}
                      searchPlaceholder={'使用回车创建'}
                      allowCreateOnEnter={true}
                      multiple={true}
                    />
                    {isFormInValid(field) && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            />
            <form.Field
              name='api_key'
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>API Key</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value ?? undefined}
                      onBlur={field.handleBlur}
                      maxLength={200}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder='输入API Key'
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
              name='base_url'
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Base URL</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value ?? undefined}
                      onBlur={field.handleBlur}
                      maxLength={200}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder='Base URL'
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
              name='tools'
              key={state.tools.length}
              children={(field) => {
                return (
                  <Field>
                    <FieldLabel
                      htmlFor={field.name}
                      help={
                        '如果希望模型拥有获取最新信息的能力，请添加网络搜索工具。'
                      }
                    >
                      调用工具
                    </FieldLabel>
                    <SelectFilter
                      options={state.tools.map((t) => {
                        return {
                          label: t.name,
                          value: t.id,
                          render: (
                            <div className={'space-y-1'}>
                              <div
                                className={'text-sm flex items-center gap-1'}
                              >
                                <span className={'text-sm'}>{t.name}</span>
                                {t.type === 'http' && (
                                  <Wrench size={12} className={'size-3'} />
                                )}
                                {t.type === 'web_search' && (
                                  <Earth size={12} className={'size-3'} />
                                )}
                              </div>
                              <div
                                title={t.description}
                                className={
                                  'text-xs text-secondary-foreground/80 line-clamp-2'
                                }
                              >
                                {t.description}
                              </div>
                            </div>
                          )
                        }
                      })}
                      value={field.state.value}
                      placeholder={'选择工具'}
                      onValueChange={(value) => {
                        field.setValue(value as string[])
                      }}
                      multiple={true}
                    />
                  </Field>
                )
              }}
            />
          </FieldGroup>
          <Button
            type={'submit'}
            className={'w-full mt-10'}
            disabled={state.submitting}
          >
            {state.submitting && <Spinner />}
            {props.id ? '更新' : '创建'}
          </Button>
        </form>
      </div>
    )
  }
)
