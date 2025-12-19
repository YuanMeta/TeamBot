import { Button, Form, InputNumber, Modal, Popconfirm, Radio } from 'antd'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect } from 'react'
import { trpc } from '~/.client/trpc'
import { useLocalState } from '~/hooks/localState'

export const AddAssistantLimit = observer(
  (props: {
    assistantId: number
    open: boolean
    onClose: () => void
    onUpdate: () => void
  }) => {
    const [form] = Form.useForm()
    const [state, setState] = useLocalState({
      submitting: false,
      limitId: null as null | number
    })
    useEffect(() => {
      if (props.open) {
        form.resetFields()
        setState({ limitId: null })
        if (props.assistantId) {
          trpc.manage.getAssistantLimit.query(props.assistantId).then((res) => {
            if (res) {
              form.setFieldsValue({
                time: res.time,
                num: res.num
              })
              setState({
                limitId: res.id
              })
            }
          })
        }
      }
    }, [props.open, props.assistantId])
    const submit = useCallback(() => {
      form.validateFields().then(async (v) => {
        try {
          setState({ submitting: true })
          if (state.limitId) {
            await trpc.manage.updateAssistantLimit.mutate({
              id: state.limitId,
              data: {
                time: v.time,
                num: v.num
              }
            })
          } else {
            await trpc.manage.addAssistantLimit.mutate({
              assistantId: props.assistantId,
              time: v.time,
              num: v.num
            })
          }
          props.onClose()
          props.onUpdate()
        } finally {
          setState({ submitting: false })
        }
      })
    }, [props.assistantId])
    return (
      <Modal
        open={props.open}
        onCancel={props.onClose}
        title={'用量限制'}
        width={400}
        footer={
          <div className={'flex items-center gap-2 justify-end'}>
            <Button onClick={props.onClose}>取消</Button>
            {!!state.limitId && (
              <Popconfirm
                title={'确认重置吗？'}
                onConfirm={() => {
                  return trpc.manage.deleteAssistantLimit
                    .mutate(state.limitId!)
                    .then(() => {
                      props.onClose()
                      props.onUpdate()
                    })
                }}
              >
                <Button>重置</Button>
              </Popconfirm>
            )}

            <Button
              type={'primary'}
              onClick={submit}
              loading={state.submitting}
            >
              确定
            </Button>
          </div>
        }
      >
        <Form form={form} layout={'vertical'}>
          <Form.Item label={'时段'} name={'time'} initialValue={'day'}>
            <Radio.Group
              options={[
                { label: '每日', value: 'day' },
                { label: '每周', value: 'week' },
                { label: '每月', value: 'month' }
              ]}
            />
          </Form.Item>
          <Form.Item
            label={'对话次数'}
            name={'num'}
            rules={[
              {
                required: true,
                message: '请输入对话次数',
                type: 'number',
                min: 1
              }
            ]}
          >
            <InputNumber
              min={1}
              max={100000}
              style={{ width: '100%' }}
              placeholder={'请输入对话次数'}
            />
          </Form.Item>
        </Form>
      </Modal>
    )
  }
)
