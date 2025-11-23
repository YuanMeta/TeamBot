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
import { useCallback, useEffect, useMemo } from 'react'
import type { TrpcRequestError } from 'types'
import { toast } from 'sonner'
import { useLocalState } from '~/hooks/localState'
import { Spinner } from '~/components/ui/spinner'
import type { TableTool } from 'types/table'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { builtInSearchMode } from './data'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { Label } from '~/components/ui/label'
import { Slider } from '~/components/ui/slider'
import { Checkbox } from '~/components/ui/checkbox'
import { TextHelp } from '~/components/project/text-help'

export const AddAssistant = observer(
  (props: { open: boolean; onClose: () => void; id: string | null }) => {
    const [state, setState] = useLocalState({
      submitting: false,
      tools: [] as TableTool[],
      update: false,
      options: {
        frequencyPenalty: {
          open: false,
          value: 0
        },
        presencePenalty: {
          open: false,
          value: 0
        },
        temperature: {
          open: false,
          value: 1
        },
        top_p: {
          open: false,
          value: 1
        }
      },
      remoteModels: [] as { id: string; model: string; provider: string }[]
    })
    const form = useForm({
      defaultValues: {
        name: '',
        mode: 'openai',
        models: [] as string[],
        api_key: null as string | null,
        base_url: null as string | null,
        options: {
          builtin_search: 'on',
          maxContextTokens: 20000,
          maxOutputTokens: 0
        } as Record<string, any>,
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
            options: {
              ...value.options,
              frequencyPenalty: state.options.frequencyPenalty,
              presencePenalty: state.options.presencePenalty,
              temperature: state.options.temperature,
              top_p: state.options.top_p
            }
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
          console.log('e', e)

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
    }, [])
    useEffect(() => {
      if (props.id) {
        trpc.manage.getAssistant.query(props.id as string).then((res) => {
          if (res) {
            Object.keys(res).forEach((key) => {
              form.setFieldValue(
                key as keyof typeof form.state.values,
                res[key as keyof typeof res]
              )
              setState({
                options: {
                  frequencyPenalty:
                    res.options.frequencyPenalty ||
                    state.options.frequencyPenalty,
                  presencePenalty:
                    res.options.presencePenalty ||
                    state.options.presencePenalty,
                  temperature:
                    res.options.temperature || state.options.temperature,
                  top_p: res.options.top_p || state.options.top_p
                }
              })
            })
          }
        })
      }
    }, [props.id])
    const modelOptions = useMemo(() => {
      return state.remoteModels
        .filter(
          (m) =>
            !form.state.values.mode || m.provider === form.state.values.mode
        )
        .map((m) => {
          return {
            label: m.model,
            value: m.model
          }
        })
    }, [state.remoteModels.length, state.update])
    useEffect(() => {
      init(props.id)
      trpc.manage.getModels.query({}).then((res) => {
        setState({ remoteModels: res })
      })
    }, [props.id, state.update])
    return (
      <div className={'max-w-[1000px] mx-auto py-4'}>
        <Card className='w-full'>
          <CardHeader>
            <CardTitle className={'flex justify-between items-center'}>
              <Button variant={'outline'} onClick={props.onClose}>
                <ChevronLeft />
                返回
              </Button>
              <span className={'ml-2 text-lg'}>添加助手开启对话</span>
              <div className={'w-20'}></div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
            >
              <div className={'flex gap-6'}>
                <div className={'flex-1'}>
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
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
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
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
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
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid

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
                                setState({ update: !state.update })
                              }}
                            >
                              <SelectTrigger className={'w-full'}>
                                <SelectValue placeholder='OpenRouter' />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='openai'>
                                  <ModelIcon mode='openai' size={20} />
                                  OpenAI
                                </SelectItem>
                                <SelectItem value='deepseek'>
                                  <ModelIcon mode='deepseek' size={20} />
                                  DeepSeek
                                </SelectItem>
                                <SelectItem value='qwen'>
                                  <ModelIcon mode='qwen' size={20} />
                                  Qwen
                                </SelectItem>
                                <SelectItem value='gemini'>
                                  <ModelIcon mode='gemini' size={20} />
                                  Gemini
                                </SelectItem>
                                <SelectItem value='openrouter'>
                                  <ModelIcon mode='openrouter' size={20} />
                                  OpenRouter
                                </SelectItem>
                                <SelectItem value='anthropic'>
                                  <ModelIcon mode='anthropic' size={20} />
                                  Anthropic
                                </SelectItem>
                                <SelectItem value='z-ai'>
                                  <ModelIcon mode='z-ai' size={20} />
                                  智谱
                                </SelectItem>
                                <SelectItem value='moonshotai'>
                                  <ModelIcon mode='moonshotai' size={20} />
                                  月之暗面
                                </SelectItem>
                                <SelectItem value='doubao'>
                                  <ModelIcon mode='doubao' size={20} />
                                  豆包
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
                      key={JSON.stringify(modelOptions)}
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
                            <FieldLabel
                              htmlFor={field.name}
                              required
                              help={
                                '模型来自OpenRouter数据，请注意，有些模型可能官方平台不支持。'
                              }
                            >
                              模型
                            </FieldLabel>
                            <SelectFilter
                              options={modelOptions}
                              value={field.state.value}
                              placeholder={'添加模型'}
                              onValueChange={(value) => {
                                field.setValue(value as string[])
                              }}
                              searchPlaceholder={'使用回车创建模型'}
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
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              API Key
                            </FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value ?? undefined}
                              onBlur={field.handleBlur}
                              maxLength={200}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
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
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              Base URL
                            </FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value ?? undefined}
                              onBlur={field.handleBlur}
                              maxLength={200}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
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
                                        className={
                                          'text-sm flex items-center gap-1'
                                        }
                                      >
                                        <span className={'text-sm'}>
                                          {t.name}
                                        </span>
                                        {t.type === 'http' && (
                                          <Wrench
                                            size={12}
                                            className={'size-3'}
                                          />
                                        )}
                                        {t.type === 'web_search' && (
                                          <Earth
                                            size={12}
                                            className={'size-3'}
                                          />
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
                </div>
                <div className={'flex-1'}>
                  <FieldGroup>
                    {builtInSearchMode.has(form.getFieldValue('mode')) && (
                      <form.Field
                        name='options.builtin_search'
                        children={(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel
                                htmlFor={field.name}
                                required
                                help={
                                  '如果使用官方api, 可开启内置搜索能力，用于获取最新的信息。或者配置工具进行网络搜索'
                                }
                              >
                                是否开启内置搜索
                              </FieldLabel>
                              <RadioGroup
                                value={field.state.value}
                                onValueChange={(value) => field.setValue(value)}
                              >
                                <div className='flex items-center gap-3'>
                                  <RadioGroupItem value='on' id='r2' />
                                  <Label htmlFor='r2'>开启内置搜索</Label>
                                </div>
                                <div className='flex items-center gap-3'>
                                  <RadioGroupItem value='off' id='r1' />
                                  <Label htmlFor='r1'>不开启内置搜索</Label>
                                </div>
                              </RadioGroup>
                            </Field>
                          )
                        }}
                      />
                    )}
                    <form.Field
                      name='options.maxContextTokens'
                      validators={{
                        onSubmit: ({ value }) => {
                          if (!/^\d+$/.test(value)) {
                            return { message: '请输入正确的最大上下文Token数' }
                          }
                          if (Number(value) < 5000 || Number(value) > 100000) {
                            return {
                              message: '最大上下文Token数应在5000-200000之间'
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
                              help={
                                '上下文越长记住的内容越多，但消耗的输入token也越多，建议设置为20000-50000之间。\n当上下文超出该值，TeamBot将自动压缩之前的对话内容，保留关键信息'
                              }
                            >
                              最大上下文Token数
                            </FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value ?? undefined}
                              onBlur={field.handleBlur}
                              maxLength={6}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        )
                      }}
                    />
                    <form.Field
                      name='options.maxOutputTokens'
                      validators={{
                        onSubmit: ({ value }) => {
                          if (!/^\d+$/.test(value)) {
                            return { message: '请输入正确的最大输出Token数' }
                          }
                          if (Number(value) < 500 && Number(value) !== 0) {
                            return {
                              message: '最大输出Token数至少应大约500'
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
                              help={
                                '限制每轮对话输出的最大Token数，0表示不限制'
                              }
                            >
                              最大输出Token数
                            </FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value ?? undefined}
                              onBlur={field.handleBlur}
                              maxLength={6}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        )
                      }}
                    />

                    <Field className={'mt-1'}>
                      <FieldLabel
                        help={
                          '如果对模型参数不是十分了解，不建议开启自定义模型参数。部分模型不支持所有参数。'
                        }
                      >
                        模型参数
                      </FieldLabel>
                      <div className={'space-y-5'}>
                        <div className={'flex items-center'}>
                          <div className={'w-52'}>
                            <div className={'leading-5 text-sm'}>
                              词汇丰富度{' '}
                              <TextHelp text='值越大，用词越丰富多样；值越低，用词更朴实简单' />
                              <br />{' '}
                              <span
                                className={'text-sm text-secondary-foreground'}
                              >
                                Frequency Penalty
                              </span>
                            </div>
                          </div>
                          <div className={'pl-2 pr-5'}>
                            <Checkbox
                              checked={state.options.frequencyPenalty.open}
                              onCheckedChange={(checked) => {
                                setState((state) => {
                                  state.options.frequencyPenalty.open =
                                    checked as boolean
                                })
                              }}
                            />
                          </div>
                          <Slider
                            min={-2}
                            max={2}
                            step={0.1}
                            value={[state.options.frequencyPenalty.value]}
                            disabled={!state.options.frequencyPenalty.open}
                            onValueChange={(value) => {
                              setState((state) => {
                                state.options.frequencyPenalty.value = value[0]
                              })
                            }}
                          />
                        </div>
                        <div className={'flex items-center'}>
                          <div className={'w-52'}>
                            <div className={'leading-5 text-sm'}>
                              表述散发度{' '}
                              <TextHelp text='值越大，越倾向不同的表达方式，避免概念重复；值越小，越倾向使用重复的概念或叙述，表达更具一致性' />
                              <br />{' '}
                              <span
                                className={'text-sm text-secondary-foreground'}
                              >
                                Presence Penalty
                              </span>
                            </div>
                          </div>
                          <div className={'pl-2 pr-5'}>
                            <Checkbox
                              checked={state.options.presencePenalty.open}
                              onCheckedChange={(checked) => {
                                setState((state) => {
                                  state.options.presencePenalty.open =
                                    checked as boolean
                                })
                              }}
                            />
                          </div>
                          <Slider
                            min={-2}
                            max={2}
                            step={0.1}
                            value={[state.options.presencePenalty.value]}
                            disabled={!state.options.presencePenalty.open}
                            onValueChange={(value) => {
                              setState((state) => {
                                state.options.presencePenalty.value = value[0]
                              })
                            }}
                          />
                        </div>
                        <div className={'flex items-center'}>
                          <div className={'w-52'}>
                            <div className={'leading-5 text-sm'}>
                              创意活跃度{' '}
                              <TextHelp text='数值越大，回答越有创意和想象力；数值越小，回答越严谨' />
                              <br />{' '}
                              <span
                                className={'text-sm text-secondary-foreground'}
                              >
                                Temperature
                              </span>
                            </div>
                          </div>
                          <div className={'pl-2 pr-5'}>
                            <Checkbox
                              checked={state.options.temperature.open}
                              onCheckedChange={(checked) => {
                                setState((state) => {
                                  state.options.temperature.open =
                                    checked as boolean
                                })
                              }}
                            />
                          </div>
                          <Slider
                            min={0}
                            max={2}
                            step={0.1}
                            value={[state.options.temperature.value]}
                            disabled={!state.options.temperature.open}
                            onValueChange={(value) => {
                              setState((state) => {
                                state.options.temperature.value = value[0]
                              })
                            }}
                          />
                        </div>
                        <div className={'flex items-center'}>
                          <div className={'w-52'}>
                            <div className={'leading-5 text-sm'}>
                              思维开放度{' '}
                              <TextHelp text='考虑多少种可能性，值越大，接受更多可能的回答；值越小，倾向选择最可能的回答。不推荐和创意活跃度一起更改' />
                              <br />{' '}
                              <span
                                className={'text-sm text-secondary-foreground'}
                              >
                                Top P
                              </span>
                            </div>
                          </div>
                          <div className={'pl-2 pr-5'}>
                            <Checkbox
                              checked={state.options.top_p.open}
                              onCheckedChange={(checked) => {
                                setState((state) => {
                                  state.options.top_p.open = checked as boolean
                                })
                              }}
                            />
                          </div>
                          <Slider
                            min={0}
                            max={1}
                            step={0.1}
                            value={[state.options.top_p.value]}
                            disabled={!state.options.top_p.open}
                            onValueChange={(value) => {
                              setState((state) => {
                                state.options.top_p.value = value[0]
                              })
                            }}
                          />
                        </div>
                      </div>
                    </Field>
                  </FieldGroup>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }
)
