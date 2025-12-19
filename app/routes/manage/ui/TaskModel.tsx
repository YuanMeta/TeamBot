import { AutoComplete, Form, Input, Modal, Select } from 'antd'
import { observer } from 'mobx-react-lite'
import { useEffect, useMemo } from 'react'
import type { AssistantData } from 'server/db/type'
import { toast } from 'sonner'
import { trpc } from '~/.client/trpc'
import { useLocalState } from '~/hooks/localState'
import { ModelIcon } from '~/lib/ModelIcon'

export const TaskModel = observer(
  (props: { open: boolean; onClose: () => void; onUpdate: () => void }) => {
    const [form] = Form.useForm()
    const [state, setState] = useLocalState({
      assistants: [] as AssistantData[],
      submitting: false
    })
    const assistantId = Form.useWatch('assistantId', form)
    useEffect(() => {
      if (props.open) {
        form.resetFields()
        trpc.manage.getAssistants
          .query({
            page: 1,
            pageSize: 1000
          })
          .then((res) => {
            setState({ assistants: res.list as unknown as AssistantData[] })
            trpc.manage.getTaskModel.query().then((res) => {
              if (res) {
                form.setFieldsValue({
                  assistantId: res.id,
                  model: res.taskModel
                })
              }
            })
          })
      }
    }, [props.open])
    const options = useMemo(() => {
      return state.assistants.find((a) => a.id === assistantId)?.models || []
    }, [assistantId])
    return (
      <Modal
        title='常规任务模型'
        open={props.open}
        onCancel={props.onClose}
        width={380}
        confirmLoading={state.submitting}
        onOk={() => {
          form.validateFields().then(async (v) => {
            setState({ submitting: true })
            try {
              await trpc.manage.addTaskModel.mutate({
                assistantId: v.assistantId,
                model: v.model
              })
              props.onClose()
              props.onUpdate()
            } catch (error: any) {
              toast.error(error.message)
            } finally {
              setState({ submitting: false })
            }
          })
        }}
      >
        <div>
          <Form form={form} layout='vertical'>
            <Form.Item
              name='assistantId'
              label='助手'
              rules={[{ required: true, message: '请选择助手' }]}
            >
              <Select
                onChange={() => {
                  form.setFieldValue('model', '')
                }}
                options={state.assistants.map((a) => ({
                  label: (
                    <div className={'flex items-center gap-2'}>
                      <ModelIcon mode={a.mode} size={16} />
                      {a.name}
                    </div>
                  ),
                  value: a.id
                }))}
                placeholder={'选择助手'}
              />
            </Form.Item>
            <Form.Item
              label={'模型'}
              name='model'
              rules={[{ required: true, message: '请选择模型' }]}
            >
              <AutoComplete
                options={options.map((o) => ({ label: o, value: o }))}
                placeholder='请输入模型'
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    )
  }
)
