import { PencilLine, Trash, Users } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { Button as AButton, message, Modal } from 'antd'
import { observer } from 'mobx-react-lite'
import { useLocalState } from '~/hooks/localState'
import { useCallback, useEffect } from 'react'
import { trpc } from '~/.client/trpc'
import { useAccess } from '~/lib/access'
import { AddRole } from './ui/AddRole'
import { RoleMember } from './ui/RoleMember'
import type { RoleData } from 'server/db/type'
import { PlusOutlined } from '@ant-design/icons'
import { Table } from 'antd'
import { toast } from 'sonner'
import { adminConfirmDialog$ } from '~/components/project/confirm-dialog'
import { TableHeader } from './ui/TableHeader'

export default observer(() => {
  const { hasAccess } = useAccess()
  const [state, setState] = useLocalState({
    page: 1,
    pageSize: 10,
    keyword: '',
    openAddRole: false,
    selectedRoleId: null as null | number,
    data: [] as RoleData[],
    total: 0,
    openRoleMember: false
  })
  const getRoles = useCallback(() => {
    trpc.manage.getRoles
      .query({
        page: state.page,
        pageSize: state.pageSize
      })
      .then((res) => {
        setState({ data: res.list as any, total: res.total })
      })
  }, [])
  useEffect(() => {
    getRoles()
  }, [])
  return (
    <div className='w-full'>
      <TableHeader
        pagination={{
          pageSize: state.pageSize,
          total: state.total,
          current: state.page,
          onChange: (page) => {
            setState({ page })
            getRoles()
          }
        }}
      >
        <AButton
          disabled={!hasAccess('manageMemberAndRole')}
          icon={<PlusOutlined />}
          type={'primary'}
          onClick={() => {
            setState({ openAddRole: true, selectedRoleId: null })
          }}
        >
          角色
        </AButton>
      </TableHeader>
      <Table
        size={'small'}
        bordered={true}
        rowKey={'id'}
        pagination={false}
        columns={[
          {
            title: '名称',
            dataIndex: 'name',
            key: 'name'
          },
          {
            title: '备注',
            dataIndex: 'remark',
            key: 'remark'
          },
          {
            title: '操作',
            dataIndex: 'actions',
            key: 'actions',
            render: (_, record) => {
              return (
                <div className={'space-x-2'}>
                  <Button
                    size={'icon-sm'}
                    variant={'outline'}
                    onClick={() => {
                      setState({
                        selectedRoleId: record.id,
                        openRoleMember: true
                      })
                    }}
                  >
                    <Users />
                  </Button>
                  <Button
                    size={'icon-sm'}
                    variant={'outline'}
                    onClick={() => {
                      setState({
                        selectedRoleId: record.id,
                        openAddRole: true
                      })
                    }}
                  >
                    <PencilLine />
                  </Button>
                  <Button
                    size={'icon-sm'}
                    variant={'outline'}
                    onClick={() => {
                      adminConfirmDialog$.next({
                        title: '提示',
                        content: '无法删除已被用户使用的角色，是否继续？',
                        okButtonProps: { danger: true },
                        onOk: async () => {
                          await trpc.manage.deleteRole
                            .mutate(record.id)
                            .then(() => getRoles())
                            .catch((error) => toast.error(error.message))
                        }
                      })
                    }}
                  >
                    <Trash />
                  </Button>
                </div>
              )
            }
          }
        ]}
        dataSource={state.data}
      />
      <AddRole
        open={state.openAddRole}
        id={state.selectedRoleId}
        onClose={() => {
          setState({ openAddRole: false, selectedRoleId: null })
        }}
        onUpdate={() => {
          getRoles()
        }}
      />
      <RoleMember
        open={state.openRoleMember}
        onClose={() => {
          setState({ openRoleMember: false })
        }}
        roleId={state.selectedRoleId!}
      />
    </div>
  )
})
