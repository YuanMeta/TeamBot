import { Delete } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useRef } from 'react'
import { trpc } from '~/.client/trpc'
import { Button as SButton } from '~/components/ui/button'
import { Button, Popconfirm, Select, Spin, Table } from 'antd'
import { useLocalState } from '~/hooks/localState'
import { toast } from 'sonner'
import type { UserData } from 'server/db/type'
import { Modal } from 'antd'
import { TableHeader } from './TableHeader'
import { IconButton } from '~/components/project/icon-button'
export const RoleMember = observer(
  (props: { roleId: number; open: boolean; onClose: () => void }) => {
    const [state, setState] = useLocalState({
      data: [] as UserData[],
      page: 1,
      pageSize: 10,
      total: 0,
      loading: false,
      options: [] as { label: string; value: number }[],
      selectedMemberId: null as null | number
    })
    const timer = useRef(0)
    const fetchOptions = useCallback(
      (keyword: string) => {
        clearTimeout(timer.current)
        timer.current = window.setTimeout(() => {
          if (!keyword) {
            setState({ options: [] })
          } else {
            trpc.manage.searchMembers.query({ keyword }).then((res) => {
              setState({
                options: res.map((item) => ({
                  label: item.name ?? item.email!,
                  value: item.id
                }))
              })
            })
          }
        }, 300)
      },
      [props.roleId]
    )
    const getRoleMembers = useCallback(() => {
      trpc.manage.getRoleMembers
        .query({
          roleId: props.roleId,
          page: state.page,
          pageSize: state.pageSize
        })
        .then((res) => {
          setState({
            data: res.list as unknown as UserData[],
            total: res.total
          })
        })
    }, [props.roleId])
    useEffect(() => {
      if (props.open) {
        setState({ page: 1, total: 0, selectedMemberId: null })
        getRoleMembers()
      }
    }, [props.open, props.roleId])
    return (
      <Modal
        open={props.open}
        title={'角色成员'}
        width={700}
        onCancel={() => {
          props.onClose()
        }}
        footer={null}
      >
        <TableHeader
          pagination={{
            pageSize: state.pageSize,
            total: state.total,
            current: state.page,
            onChange: (page) => {
              setState({ page })
              getRoleMembers()
            }
          }}
        >
          <Select
            placeholder={'选择成员'}
            className={'w-48'}
            allowClear={true}
            value={state.selectedMemberId}
            onChange={(e) => {
              setState({ selectedMemberId: e as number })
            }}
            options={state.options}
            showSearch={{ filterOption: false, onSearch: fetchOptions }}
            notFoundContent={state.loading ? <Spin size='small' /> : null}
          />
          <Button
            disabled={!state.selectedMemberId}
            type={'primary'}
            onClick={() => {
              if (state.selectedMemberId) {
                trpc.manage.addRoleToUser
                  .mutate({
                    roleId: props.roleId,
                    userId: state.selectedMemberId
                  })
                  .then(() => {
                    getRoleMembers()
                    setState({ selectedMemberId: null })
                  })
                  .catch((error: any) => {
                    toast.error(error.message)
                  })
              }
            }}
          >
            添加
          </Button>
        </TableHeader>
        <Table
          size={'small'}
          rowKey={'id'}
          columns={[
            {
              title: '成员名',
              dataIndex: 'name',
              key: 'name'
            },
            {
              title: '邮箱',
              dataIndex: 'email',
              key: 'email'
            },
            {
              title: '操作',
              dataIndex: 'action',
              key: 'action',
              render: (_, record) => (
                <Popconfirm
                  title={'移除后该成员不在拥有该角色，是否继续？'}
                  okButtonProps={{ danger: true }}
                  onConfirm={() => {
                    return trpc.manage.removeRoleFromUser
                      .mutate({
                        roleId: props.roleId,
                        userId: record.id
                      })
                      .then(() => {
                        getRoleMembers()
                      })
                  }}
                >
                  <div className={'inline-flex'}>
                    <IconButton>
                      <Delete />
                    </IconButton>
                  </div>
                </Popconfirm>
              )
            }
          ]}
          dataSource={state.data}
          pagination={false}
        />
      </Modal>
    )
  }
)
