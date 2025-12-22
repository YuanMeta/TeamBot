import { observer } from 'mobx-react-lite'
import { trpc } from '~/.client/trpc'
import { useCallback, useEffect, useMemo } from 'react'
import { useLocalState } from '~/hooks/localState'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import type { AssistantData, ToolData } from 'server/db/type'
import {
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Slider
} from 'antd'
import { ModelIcon } from '~/lib/ModelIcon'
import { searchModes } from './data'
import { LeftOutlined } from '@ant-design/icons'
import { toast } from 'sonner'

const modeData = [
  {
    value: 'deepseek',
    label: (
      <div className={'flex items-center gap-2'}>
        <ModelIcon mode='deepseek' size={18} />
        DeepSeek
      </div>
    )
  },
  {
    value: 'qwen',
    label: (
      <div className={'flex items-center gap-2'}>
        <ModelIcon mode='qwen' size={18} />
        Qwen
      </div>
    )
  },
  {
    value: 'openai',
    label: (
      <div className={'flex items-center gap-2'}>
        <ModelIcon mode='openai' size={18} />
        OpenAI 官方
      </div>
    )
  },
  {
    value: 'openai-compatible',
    label: (
      <div className={'flex items-center gap-2'}>
        <ModelIcon mode='openai' size={18} />
        OpenAI 兼容
      </div>
    )
  },
  {
    value: 'openrouter',
    label: (
      <div className={'flex items-center gap-2'}>
        <ModelIcon mode='openrouter' size={18} />
        OpenRouter
      </div>
    )
  },
  {
    value: 'gemini',
    label: (
      <div className={'flex items-center gap-2'}>
        <ModelIcon mode='gemini' size={18} />
        Gemini
      </div>
    )
  },
  {
    value: 'anthropic',
    label: (
      <div className={'flex items-center gap-2'}>
        <ModelIcon mode='anthropic' size={18} />
        Anthropic
      </div>
    )
  },

  {
    value: 'z-ai',
    label: (
      <div className={'flex items-center gap-2'}>
        <ModelIcon mode='z-ai' size={18} />
        智普
      </div>
    )
  },
  {
    value: 'moonshotai',
    label: (
      <div className={'flex items-center gap-2'}>
        <ModelIcon mode='moonshotai' size={18} />
        月之暗面
      </div>
    )
  },
  {
    value: 'doubao',
    label: (
      <div className={'flex items-center gap-2'}>
        <ModelIcon mode='doubao' size={18} />
        豆包
      </div>
    )
  }
]

const builtinSearchMode = new Set([
  'openai',
  'doubao',
  'qwen',
  'gemini',
  'openrouter',
  'anthropic',
  'z-ai'
])

export const AddAssistant = observer(
  (props: {
    open: boolean
    onClose: () => void
    id: number | null
    onChange: () => void
  }) => {
    const [state, setState] = useLocalState({
      submitting: false,
      tools: [] as ToolData[],
      webSearchTools: [] as ToolData[],
      remoteModels: [] as {
        id: number
        model: string
        provider: string
        options: string | null
      }[]
    })
    const [form] = Form.useForm<
      AssistantData & { tools: string[]; webSearchId?: string; mcps: string[] }
    >()
    const mode = Form.useWatch('mode', form)
    const summaryMode = Form.useWatch(['options', 'summaryMode'], form)
    const webSearchMode = Form.useWatch(['options', 'webSearchMode'], form)
    const openFrequencyPenalty = Form.useWatch(
      ['options', 'frequencyPenalty', 'open'],
      form
    )

    const openPresencePenalty = Form.useWatch(
      ['options', 'presencePenalty', 'open'],
      form
    )
    const openTemperature = Form.useWatch(
      ['options', 'temperature', 'open'],
      form
    )
    const openTopP = Form.useWatch(['options', 'topP', 'open'], form)
    const init = useCallback(async () => {
      trpc.manage.getTools
        .query({
          page: 1,
          pageSize: 1000,
          type: ['http', 'mcp', 'system']
        })
        .then((res) => {
          setState({ tools: res.tools as ToolData[] })
        })
      trpc.manage.getModels.query({}).then((res) => {
        setState({ remoteModels: res })
      })
      trpc.manage.getWebSearches
        .query({ page: 1, pageSize: 100 })
        .then((res) => {
          setState({ webSearchTools: res.list as ToolData[] })
        })
    }, [])
    useEffect(() => {
      if (props.id) {
        trpc.manage.getAssistant.query(props.id).then((res) => {
          if (res) {
            form.setFieldsValue(res)
          }
        })
      }
    }, [props.id])
    const modelOptions = useMemo(() => {
      if (mode === 'openrouter') {
        return state.remoteModels
          .map((m) => {
            const options = m.options ? JSON.parse(m.options) : null
            return {
              label: options?.id,
              value: options?.id
            }
          })
          .filter((m) => !!m.value)
      }
      return state.remoteModels
        .filter((m) => !mode || m.provider === mode)
        .map((m) => {
          return {
            label: m.model,
            value: m.model
          }
        })
    }, [state.remoteModels.length, mode])
    useEffect(() => {
      init()
    }, [props.id])

    const submit = useCallback(() => {
      form.validateFields().then(async (v) => {
        setState({ submitting: true })
        try {
          await trpc.manage.checkConnect.mutate({
            api_key: v.apiKey || null,
            base_url: v.baseUrl || null,
            mode: v.mode,
            models: v.models
          })
          if (props.id) {
            await trpc.manage.updateAssistant.mutate({
              tools: v.tools,
              mcps: v.mcps,
              id: props.id,
              data: {
                name: v.name,
                mode: v.mode,
                models: v.models,
                webSearchId: v.webSearchId || null,
                api_key: v.apiKey || null,
                base_url: v.baseUrl || null,
                prompt: v.prompt || null,
                options: v.options
              }
            })
          } else {
            await trpc.manage.createAssistant.mutate({
              tools: v.tools,
              mcps: v.mcps,
              data: {
                name: v.name,
                mode: v.mode,
                models: v.models,
                webSearchId: v.webSearchId || null,
                api_key: v.apiKey || null,
                base_url: v.baseUrl || null,
                prompt: v.prompt || null,
                options: v.options
              }
            })
          }
          props.onChange()
          props.onClose()
        } catch (e: any) {
          toast.error(e.message)
        } finally {
          setState({ submitting: false })
        }
      })
    }, [props.id])
    return (
      <div className={'max-w-[1000px] mx-auto py-4'}>
        <Card className='w-full'>
          <CardHeader>
            <CardTitle className={'flex justify-between items-center'}>
              <Button onClick={props.onClose} icon={<LeftOutlined />}>
                返回
              </Button>
              <span className={'ml-2 text-lg'}>添加助手开启对话</span>
              <div className={'w-20'}></div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form layout={'vertical'} form={form}>
              <div className={'flex gap-6'}>
                <div className={'flex-1'}>
                  <Form.Item
                    name={'name'}
                    label={'名称'}
                    rules={[{ required: true, message: '请输入名称' }]}
                  >
                    <Input placeholder={'请输入名称'} />
                  </Form.Item>
                  <Form.Item
                    name={'mode'}
                    label={'提供方'}
                    initialValue={'qwen'}
                    rules={[{ required: true, message: '请选择提供方' }]}
                  >
                    <Select
                      placeholder={'请选择提供方'}
                      options={modeData}
                      onChange={() => {
                        form.setFieldValue(['options', 'webSearchMode'], 'none')
                      }}
                    />
                  </Form.Item>
                  <Form.Item
                    name={'models'}
                    label={'模型'}
                    tooltip={
                      '模型数据来自OpenRouter，请注意，有些模型可能官方平台不支持。'
                    }
                    rules={[{ required: true, message: '请选择模型' }]}
                  >
                    <Select
                      mode='tags'
                      placeholder='添加模型（使用回车创建）'
                      options={modelOptions}
                    />
                  </Form.Item>
                  <Form.Item name={'apiKey'} label={'API Key'}>
                    <Input.Password placeholder={'请输入API Key'} />
                  </Form.Item>
                  <Form.Item
                    name={'baseUrl'}
                    label={'Base URL'}
                    rules={[
                      {
                        required: mode === 'openai-compatible',
                        message: '请输入正确Base URL',
                        type: 'url'
                      }
                    ]}
                  >
                    <Input placeholder={'请输入Base URL'} />
                  </Form.Item>
                  <Form.Item
                    name={'tools'}
                    label={'调用工具'}
                    initialValue={[]}
                  >
                    <Select
                      mode='multiple'
                      placeholder={'选择模型工具'}
                      labelRender={(props) =>
                        state.tools.find((t) => t.id === props.value)?.name
                      }
                      options={state.tools
                        .filter((t) => t.type !== 'mcp')
                        .map((t) => {
                          return {
                            value: t.id,
                            label: (
                              <div className={'space-y-0.5'}>
                                <div
                                  className={'text-sm flex items-center gap-1'}
                                >
                                  <span className={'text-sm'}>{t.name}</span>
                                </div>
                                <div
                                  title={t.description}
                                  className={
                                    'text-xs text-secondary-foreground/80 line-clamp-2 max-w-full whitespace-normal'
                                  }
                                >
                                  <span>{t.description}</span>
                                </div>
                              </div>
                            )
                          }
                        })}
                    />
                  </Form.Item>
                  <Form.Item
                    label={'工具最大调用次数'}
                    initialValue={10}
                    name={['options', 'stepCount']}
                    rules={[
                      {
                        required: true,
                        validator: (_, value) => {
                          if (!/^\d+$/.test(value)) {
                            return Promise.reject(
                              '请输入正确的工具最大调用次数'
                            )
                          }
                          if (Number(value) < 3 || Number(value) > 50) {
                            return Promise.reject(
                              '工具最大调用次数应在3-50之间'
                            )
                          }
                          return Promise.resolve()
                        }
                      }
                    ]}
                    tooltip={
                      '如果超出该调用次数，对话自动终止，防止意外循环调用。如果使用了mcp服务，建议调高该值。'
                    }
                  >
                    <Slider min={3} max={50} step={1} />
                  </Form.Item>
                  <Form.Item
                    label={'系统提示词'}
                    name={'prompt'}
                    tooltip={'系统提示词可定义助手的性格、行为等。'}
                  >
                    <Input.TextArea
                      placeholder={'你是一个有用的AI助手'}
                      rows={3}
                    />
                  </Form.Item>
                </div>
                <div className={'flex-1'}>
                  <Form.Item label={'MCP服务'} name={'mcps'} initialValue={[]}>
                    <Select
                      mode='multiple'
                      placeholder={'选择MCP服务'}
                      options={state.tools
                        .filter((t) => t.type === 'mcp')
                        .map((t) => {
                          return {
                            label: t.name,
                            value: t.id
                          }
                        })}
                    />
                  </Form.Item>
                  <Form.Item
                    label={'网络搜索'}
                    name={['options', 'webSearchMode']}
                    initialValue={'none'}
                    tooltip={
                      '部分模型厂商提供了官方内置的搜索能力，可根据需要开启官方搜索或使用自定义网络搜索工具。'
                    }
                  >
                    <Radio.Group
                      options={
                        builtinSearchMode.has(mode)
                          ? [
                              { value: 'none', label: '不开启' },
                              { value: 'builtin', label: '内置搜索' },
                              { value: 'custom', label: '自定义网络搜索' }
                            ]
                          : [
                              { value: 'none', label: '不开启' },
                              { value: 'custom', label: '自定义网络搜索' }
                            ]
                      }
                    />
                  </Form.Item>
                  {webSearchMode === 'custom' && (
                    <div>
                      <div className={'flex items-center w-full gap-5'}>
                        <Form.Item
                          label={'选择搜索工具'}
                          name={'webSearchId'}
                          className={'flex-1'}
                          tooltip={'请先创建搜索工具'}
                          rules={[
                            { required: true, message: '请选择网络搜索工具' }
                          ]}
                        >
                          <Select
                            placeholder={'请选择网络搜索工具'}
                            options={state.webSearchTools.map((t) => {
                              return {
                                label: (
                                  <div className={'flex items-center gap-2'}>
                                    <img
                                      src={
                                        searchModes.find(
                                          (m) => m.value === t.webSearchMode
                                        )?.icon
                                      }
                                      className={'size-4'}
                                    />
                                    {
                                      searchModes.find(
                                        (m) => m.value === t.webSearchMode
                                      )?.label
                                    }
                                  </div>
                                ),
                                value: t.id
                              }
                            })}
                          />
                        </Form.Item>
                        <Form.Item
                          label={'Agent模式'}
                          tooltip={
                            'Agent模式将搜索注册为模型工具，由模型根据提问自主决定是否进行搜索，不可手动关闭或开启，模型可能会根据需要进行多次网络搜索，适合能力较强的现代模型。'
                          }
                          name={['options', 'agentWebSearch']}
                          initialValue={false}
                        >
                          <Radio.Group
                            options={[
                              { label: '是', value: true },
                              { label: '否', value: false }
                            ]}
                          />
                        </Form.Item>
                        <Form.Item
                          label={'是否压缩搜索结果'}
                          tooltip={
                            '保留搜索关键信息，去除冗余信息，可提升模型注意力，减少上下文占用, 可能会降低搜索执行时间，需要消耗少量Token用于压缩。'
                          }
                          name={['options', 'compressSearchResults']}
                          initialValue={false}
                        >
                          <Radio.Group
                            options={[
                              { label: '是', value: true },
                              { label: '否', value: false }
                            ]}
                          />
                        </Form.Item>
                      </div>
                    </div>
                  )}
                  <div className={'flex items-center *:flex-1 gap-6'}>
                    <Form.Item
                      label={'上下文压缩模式'}
                      name={['options', 'summaryMode']}
                      tooltip={
                        '压缩模式在超出最大上下文Token时，压缩之前的对话内容，保留关键信息。切割模式在上下文中仅保留最近的几轮对话。'
                      }
                      initialValue={'compress'}
                    >
                      <Radio.Group
                        options={[
                          { label: '压缩', value: 'compress' },
                          { label: '切割', value: 'slice' }
                        ]}
                      />
                    </Form.Item>
                    {summaryMode === 'compress' && (
                      <Form.Item
                        label={'最大上下文Token'}
                        name={['options', 'maxContextTokens']}
                        initialValue={30000}
                        tooltip={
                          '上下文越长模型记住的内容越多，但消耗的缓存输入token也越多。建议设置为20000-100000之间。当上下文超出该值，TeamBot将自动压缩之前的对话内容，保留关键信息。'
                        }
                        rules={[
                          {
                            required: true,
                            validator: (_, value) => {
                              if (!/^\d+$/.test(value)) {
                                return Promise.reject(
                                  '请输入正确的最大上下文Token数'
                                )
                              }
                              if (
                                Number(value) < 5000 ||
                                Number(value) > 200000
                              ) {
                                return Promise.reject(
                                  '最大上下文Token数应在5000-200000之间'
                                )
                              }
                              return Promise.resolve()
                            }
                          }
                        ]}
                      >
                        <InputNumber
                          placeholder={'请输入最大上下文Token'}
                          style={{ width: '100%' }}
                          min={5000}
                          max={200000}
                        />
                      </Form.Item>
                    )}
                    {summaryMode === 'slice' && (
                      <Form.Item
                        label={'保留对话轮数'}
                        name={['options', 'messageCount']}
                        initialValue={10}
                        tooltip={
                          '超出对话轮数的历史对话将被忽略，上下文仅保留最新的对话信息，5-30之间。'
                        }
                        rules={[
                          {
                            required: true,
                            validator: (_, value) => {
                              if (!/^\d+$/.test(value)) {
                                return Promise.reject('请输入正确的对话轮数')
                              }
                              if (Number(value) < 5 || Number(value) > 30) {
                                return Promise.reject('对话轮数应在5-30之间')
                              }
                              return Promise.resolve()
                            }
                          }
                        ]}
                      >
                        <InputNumber
                          placeholder={'请输入对话轮数'}
                          style={{ width: '100%' }}
                          min={5}
                          max={30}
                        />
                      </Form.Item>
                    )}
                  </div>

                  <div className={'flex items-center *:flex-1 gap-5'}>
                    <Form.Item
                      label={'最大输出Token'}
                      name={['options', 'maxOutputTokens']}
                      initialValue={0}
                      tooltip={'限制每轮对话输出的最大Token数，0表示不限制。'}
                      rules={[
                        {
                          required: true,
                          validator: (_, value) => {
                            if (!/^\d+$/.test(value)) {
                              return Promise.reject(
                                '请输入正确的最大输出Token数'
                              )
                            }
                            if (Number(value) < 500 && Number(value) !== 0) {
                              return Promise.reject(
                                '最大输出Token数至少应大于500'
                              )
                            }
                            return Promise.resolve()
                          }
                        }
                      ]}
                    >
                      <InputNumber
                        placeholder={'请输入最大输出Token'}
                        max={100000}
                      />
                    </Form.Item>
                  </div>

                  <Form.Item
                    label={'词汇丰富度 (Frequency Penalty)'}
                    tooltip={
                      '值越大，用词越丰富多样；值越低，用词更朴实简单。如对该参数不是十分了解，不建议开启。'
                    }
                  >
                    <div className={'flex items-center gap-6'}>
                      <Form.Item
                        noStyle={true}
                        name={['options', 'frequencyPenalty', 'open']}
                        valuePropName={'checked'}
                      >
                        <Checkbox>开启</Checkbox>
                      </Form.Item>
                      <Form.Item
                        noStyle={true}
                        name={['options', 'frequencyPenalty', 'value']}
                        initialValue={0}
                      >
                        <Slider
                          step={0.1}
                          className={'flex-1'}
                          disabled={!openFrequencyPenalty}
                          min={-2}
                          max={2}
                          range={false}
                        />
                      </Form.Item>
                    </div>
                  </Form.Item>
                  <Form.Item
                    label={'表述散发度 (Presence Penalty)'}
                    tooltip={
                      '值越大，越倾向不同的表达方式，避免概念重复；值越小，越倾向使用重复的概念或叙述，表达更具一致性。如对该参数不是十分了解，不建议开启。'
                    }
                  >
                    <div className={'flex items-center gap-6'}>
                      <Form.Item
                        noStyle={true}
                        name={['options', 'presencePenalty', 'open']}
                        valuePropName={'checked'}
                      >
                        <Checkbox>开启</Checkbox>
                      </Form.Item>
                      <Form.Item
                        noStyle={true}
                        name={['options', 'presencePenalty', 'value']}
                        initialValue={0}
                      >
                        <Slider
                          step={0.1}
                          className={'flex-1'}
                          disabled={!openPresencePenalty}
                          min={-2}
                          max={2}
                          range={false}
                        />
                      </Form.Item>
                    </div>
                  </Form.Item>
                  <Form.Item
                    label={'创意活跃度 (Temperature)'}
                    tooltip={
                      '数值越大，回答越有创意和想象力；数值越小，回答越严谨。如对该参数不是十分了解，不建议开启。'
                    }
                  >
                    <div className={'flex items-center gap-6'}>
                      <Form.Item
                        noStyle={true}
                        name={['options', 'temperature', 'open']}
                        valuePropName={'checked'}
                      >
                        <Checkbox>开启</Checkbox>
                      </Form.Item>
                      <Form.Item
                        noStyle={true}
                        name={['options', 'temperature', 'value']}
                        initialValue={1}
                      >
                        <Slider
                          step={0.1}
                          className={'flex-1'}
                          disabled={!openTemperature}
                          min={0}
                          max={2}
                          range={false}
                        />
                      </Form.Item>
                    </div>
                  </Form.Item>
                  <Form.Item
                    label={'思维开放度 (Top P)'}
                    tooltip={
                      '考虑多少种可能性，值越大，接受更多可能的回答；值越小，倾向选择最可能的回答。不推荐和创意活跃度一起更改。如对该参数不是十分了解，不建议开启。'
                    }
                  >
                    <div className={'flex items-center gap-6'}>
                      <Form.Item
                        noStyle={true}
                        name={['options', 'topP', 'open']}
                        valuePropName={'checked'}
                      >
                        <Checkbox>开启</Checkbox>
                      </Form.Item>
                      <Form.Item
                        noStyle={true}
                        name={['options', 'topP', 'value']}
                        initialValue={1}
                      >
                        <Slider
                          step={0.1}
                          className={'flex-1'}
                          disabled={!openTopP}
                          min={0}
                          max={1}
                          range={false}
                        />
                      </Form.Item>
                    </div>
                  </Form.Item>
                </div>
              </div>
              <div className={'flex justify-center mt-3 px-5'}>
                <Button
                  type={'primary'}
                  onClick={submit}
                  className={'w-96 max-w-96'}
                  loading={state.submitting}
                >
                  {props.id ? '更新' : '创建'}
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </div>
    )
  }
)
