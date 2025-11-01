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
import { ChevronLeft, WifiOff } from 'lucide-react'
import { SelectFilter } from '~/components/ui/select-filter'
import { isFormInValid } from '~/lib/utils'
import { trpc } from '~/.client/trpc'
import { useEffect } from 'react'
import type { SearchOptions, TrpcRequestError } from 'types'
import { toast } from 'sonner'
import { useLocalState } from '~/hooks/localState'
import { Spinner } from '~/components/ui/spinner'
import googleIcon from '~/assets/google.png'
import exaIcon from '~/assets/exa.png'
import tavilyIcon from '~/assets/tavily.png'
import { Switch } from '~/components/ui/switch'

export const AddAssistant = observer(
  (props: { open: boolean; onClose: () => void; id: string | null }) => {
    const [state, setState] = useLocalState({
      submitting: false
    })
    const form = useForm({
      defaultValues: {
        name: '',
        mode: 'openai',
        models: [] as string[],
        apiKey: null as string | null,
        baseUrl: null as string | null,
        options: {} as Record<string, any>,
        webSearch: {} as SearchOptions
      },
      onSubmit: async ({ value }) => {
        setState({ submitting: true })
        try {
          await trpc.manage.checkConnect.mutate({
            mode: value.mode,
            models: value.models,
            apiKey: value.apiKey || null,
            baseUrl: value.baseUrl || null
          })
          const data = {
            mode: value.mode,
            models: value.models,
            name: value.name,
            api_key: value.apiKey || null,
            base_url: value.baseUrl || null,
            options: {},
            web_search: value.webSearch
          }
          if (props.id) {
            await trpc.manage.updateAssistant.mutate({
              id: props.id as string,
              ...data
            })
          } else {
            await trpc.manage.createAssistant.mutate(data)
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
    useEffect(() => {
      if (props.id) {
        trpc.manage.getAssistant.query(props.id).then((res) => {
          if (res) {
            form.reset({
              mode: res.mode,
              name: res.name,
              models: res.models as string[],
              apiKey: res.api_key,
              baseUrl: res.base_url,
              options: {},
              webSearch: res.web_search as unknown as SearchOptions
            })
          }
        })
      }
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
                        if (value === 'openrouter') {
                          form.setFieldValue('webSearch.mode', 'openrouter')
                        } else {
                          if (
                            field.form.getFieldValue('webSearch.mode') ===
                            'openrouter'
                          ) {
                            form.setFieldValue('webSearch.mode', undefined)
                          }
                        }
                        // form.setValue(
                        //   'options.searchMode',
                        //   value === 'openrouter' ? 'openrouter' : ''
                        // )
                        // form.clearErrors('apiKey')
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
              name='apiKey'
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
              name='baseUrl'
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
              name='webSearch.mode'
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>网络搜索模式</FieldLabel>
                    <Select
                      value={field.state.value}
                      defaultValue={'disabled'}
                      onValueChange={(value) => {
                        field.setValue(value as any)
                      }}
                    >
                      <SelectTrigger className={'w-full'}>
                        <SelectValue placeholder='选择搜索模式' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value='openrouter'
                          disabled={
                            field.form.state.values.mode !== 'openrouter'
                          }
                        >
                          <ModelIcon mode='openrouter' size={20} />
                          OpenRouter
                        </SelectItem>
                        <SelectItem value={'tavily'}>
                          <div className={'flex items-center gap-1.5'}>
                            <img src={tavilyIcon} className={'size-4'} />
                            Tavily
                          </div>
                        </SelectItem>
                        <SelectItem value={'google'}>
                          <div className={'flex items-center gap-1.5'}>
                            <img src={googleIcon} className={'size-4'} />
                            Google
                          </div>
                        </SelectItem>
                        <SelectItem value={'exa'}>
                          <div className={'flex items-center gap-1.5'}>
                            <img src={exaIcon} className={'size-4'} />
                            Exa
                          </div>
                        </SelectItem>
                        <SelectItem value={'disabled'}>
                          <div className={'flex items-center gap-1.5'}>
                            <WifiOff size={20} />
                            不使用搜索功能
                          </div>
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
            <form.Subscribe
              selector={(state) => [state.values.webSearch?.mode]}
              children={([mode]) => {
                if (mode === 'disabled' || !mode) {
                  return null
                }
                return (
                  <>
                    <form.Field
                      name='webSearch.apiKey'
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
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              aria-invalid={isInvalid}
                              placeholder='输入Api Key'
                              autoComplete='off'
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        )
                      }}
                    />
                    {mode !== 'openrouter' && (
                      <form.Field
                        name='webSearch.auto'
                        defaultValue={true}
                        children={(field) => {
                          return (
                            <Field>
                              <FieldLabel htmlFor={field.name} required>
                                开启自动搜索
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
                    )}
                    {mode === 'google' && (
                      <form.Field
                        name='webSearch.cseId'
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
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          )
                        }}
                      />
                    )}
                  </>
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
