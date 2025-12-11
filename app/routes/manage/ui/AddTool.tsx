import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import z, { ZodError } from 'zod'
import { trpc } from '~/.client/trpc'
import CodeEditor from '~/components/project/Code'
import { toast } from 'sonner'
import { useLocalState } from '~/hooks/localState'
import { Button, Form, Input, Modal } from 'antd'

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

const useTexts = () => {
  return useMemo(
    () => ({
      http_desc: '准确描述HTTP工具的作用',
      // web_search_desc:
      //   '通过搜索引擎获取最新网页内容，用于补充或验证模型的知识。如果你认为需要最新的信息来回答用户的问题，请使用此工具。',
      http_json: `{
  "url": "https://example.tb",
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

const InputParams = observer(
  (props: {
    open: boolean
    onClose: () => void
    onConfirm: (data: Record<string, any>) => Promise<boolean>
    input: {
      key: string
      type: 'string' | 'number'
      describe: string
    }[]
  }) => {
    const [state, setState] = useLocalState({
      submitting: false
    })
    const [form] = Form.useForm()
    const confirm = useCallback(() => {
      form.validateFields().then(async (value) => {
        setState((state) => {
          state.submitting = true
        })
        props
          .onConfirm(value)
          .then((res) => {
            if (res) {
              props.onClose()
            }
          })
          .finally(() => {
            setState((state) => {
              state.submitting = false
            })
          })
      })
    }, [props.onConfirm, props.input])
    return (
      <Modal
        open={props.open}
        onCancel={props.onClose}
        title={'请求测试'}
        footer={null}
        width={420}
      >
        <Form form={form} layout='vertical' key={JSON.stringify(props.input)}>
          {props.input.map((input) => (
            <Form.Item
              key={input.key}
              name={input.key}
              label={input.key}
              rules={[
                {
                  required: true,
                  validator: (_, val) => {
                    try {
                      if (input.type === 'string') {
                        z.string().min(1).parse(val)
                      } else if (input.type === 'number') {
                        z.coerce.number().parse(val)
                      }
                      return Promise.resolve()
                    } catch (e: any) {
                      if (e instanceof ZodError) {
                        return Promise.reject(e.issues[0].message)
                      }
                      return Promise.reject(e.message)
                    }
                  }
                }
              ]}
            >
              <Input placeholder={input.describe} />
            </Form.Item>
          ))}
        </Form>
        <Button
          block={true}
          onClick={confirm}
          className={'mt-3'}
          loading={state.submitting}
          type={'primary'}
        >
          确认
        </Button>
      </Modal>
    )
  }
)

export const AddTool = observer(
  (props: {
    open: boolean
    id?: string
    onClose: () => void
    onUpdate: () => void
  }) => {
    const texts = useTexts()
    const dataRef = useRef<Record<string, any>>({})
    const [state, setState] = useLocalState({
      openInputParams: false,
      inputParams: [] as {
        key: string
        type: 'string' | 'number'
        describe: string
      }[]
    })
    const httpTest = useCallback(
      async (params: z.infer<typeof httpJsonSchema>) => {
        try {
          await trpc.common.httpTest.mutate(params)
          return true
        } catch (e: any) {
          toast.error(`http 请求失败: ${e.message}`)
          return false
        }
      },
      []
    )
    const save = useCallback(
      async (data: Record<string, any>) => {
        try {
          if (props.id) {
            await trpc.manage.updateTool.mutate({
              id: props.id,
              data: data as any
            })
          } else {
            await trpc.manage.createTool.mutate(data as any)
          }
        } catch (e: any) {
          toast.error(e.message)
          return
        }
        props.onUpdate()
        props.onClose()
      },
      [props.id]
    )
    const [form] = Form.useForm()
    const submit = useCallback(async () => {
      return form.validateFields().then(async (value) => {
        const saveData = async () => {
          await save({
            id: value.id,
            description: value.description,
            name: value.name,
            params: value.params,
            auto: value.auto
          })
        }
        const http = JSON.parse(value.params)
        if (http.input?.length) {
          dataRef.current = value
          setState((state) => {
            state.openInputParams = true
            state.inputParams = http.input
          })
        } else {
          const valid = await httpTest(http)
          if (valid) {
            saveData()
          }
        }
      })
    }, [props.id, form])
    useEffect(() => {
      if (props.open) {
        form.resetFields()
        if (props.id) {
          trpc.manage.getTool.query(props.id).then((res) => {
            if (res) {
              form.setFieldsValue({
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
      <Modal
        open={props.open}
        onCancel={props.onClose}
        title={props.id ? '编辑工具' : '添加工具'}
        width={500}
        onOk={submit}
      >
        <div>
          <Form form={form} layout='vertical'>
            <Form.Item
              name={'id'}
              label={'工具ID'}
              rules={[
                {
                  required: true,
                  validator: (_, value) => {
                    if (!value) {
                      return Promise.reject(new Error('请输入工具ID'))
                    }
                    if (
                      !/^[a-zA-Z_]+$/.test(value) ||
                      /^_/.test(value) ||
                      /_$/.test(value)
                    ) {
                      return Promise.reject(
                        new Error(
                          '工具ID只能包含小写字母和下划线，且不能以下划线开头或结尾'
                        )
                      )
                    }
                    return Promise.resolve()
                  }
                }
              ]}
              tooltip={
                '工具ID是工具的唯一标识，只能包含小写字母和下划线。例如: web_search, 工具一旦创建，ID不可更改。'
              }
            >
              <Input placeholder='请输入工具ID' />
            </Form.Item>
            <Form.Item name={'name'} label={'工具名称'}>
              <Input placeholder='请输入工具名称' />
            </Form.Item>
            <Form.Item
              name={'description'}
              label={'工具描述'}
              rules={[{ required: true, message: '请输入工具描述' }]}
              tooltip={
                '工具描述是帮助模型理解工具用途的方法，模型将根据描述选择是否使用该工具。\n描述应该简洁明了，尽量不要超过200个字符。'
              }
            >
              <Input.TextArea placeholder={texts.http_desc} />
            </Form.Item>
            <Form.Item
              name={'params'}
              initialValue={texts.http_json}
              rules={[
                {
                  required: true,
                  validator: (_, value) => {
                    if (!value) {
                      return Promise.reject(new Error('请输入请求参数'))
                    }
                    try {
                      httpJsonSchema.parse(JSON.parse(value))
                    } catch (e: any) {
                      return Promise.reject(new Error(e.message))
                    }
                    return Promise.resolve()
                  }
                }
              ]}
              label={'请求参数'}
              tooltip={`url和method是必填项，其他参数为可选，\n如果为POST请求，将以Application/json格式发送body参数。\n如果希望大模型在请求时加入动态参数，请填写input参数，参数将附加在params中， \ninput参数仅支持number和string类型，请准确填写参数描述以让大模型理解参数含义。`}
            >
              <CodeEditor language={'json'} height={'300px'} />
            </Form.Item>
          </Form>
        </div>
        <InputParams
          open={state.openInputParams}
          input={state.inputParams}
          onConfirm={async (params) => {
            const http = JSON.parse(dataRef.current.params.http)
            const res = await httpTest({
              url: http.url,
              method: http.method,
              headers: http.headers,
              params: {
                ...params,
                ...http.params
              }
            })
            if (res) {
              await save(dataRef.current as any)
              return true
            } else {
              return false
            }
          }}
          onClose={() => {
            setState((state) => {
              state.openInputParams = false
            })
          }}
        />
      </Modal>
    )
  }
)
