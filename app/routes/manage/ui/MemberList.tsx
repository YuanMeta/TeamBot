import { Input, Table, Tooltip } from 'antd'
import { KeyRound, PencilLine, Trash } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect } from 'react'
import type { UserData } from 'server/db/type'
import { trpc } from '~/.client/trpc'
import { Button } from '~/components/ui/button'
import { useLocalState } from '~/hooks/localState'
import { useAccess } from '~/lib/access'
import { AddMember } from './AddMemeber'
import { Button as AButton } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import isHotkey from 'is-hotkey'
import { adminConfirmDialog$ } from '~/components/project/confirm-dialog'
import { toast } from 'sonner'
import { TableHeader } from './TableHeader'
export const MemberList = observer(() => {
  const { hasAccess } = useAccess()
  const [state, setState] = useLocalState({
    page: 1,
    pageSize: 10,
    keyword: '',
    data: [] as UserData[],
    total: 0,
    openAddMember: false,
    selectedMemberId: null as null | number
  })
  const getMembers = useCallback(() => {
    trpc.manage.getMembers
      .query({
        page: state.page,
        pageSize: state.pageSize,
        keyword: state.keyword
      })
      .then((res) => {
        setState({ data: res.members as any, total: res.total })
      })
  }, [])
  useEffect(() => {
    getMembers()
  }, [])
  return (
    <div>
      <TableHeader
        pagination={{
          pageSize: state.pageSize,
          total: state.total,
          current: state.page,
          onChange: (page) => {
            setState({ page })
            getMembers()
          }
        }}
      >
        <div>
          <Input
            placeholder='搜索'
            prefix={<SearchOutlined />}
            className={'w-40'}
            value={state.keyword}
            onKeyDown={(e) => {
              if (isHotkey('enter', e)) {
                getMembers()
              }
            }}
            onChange={(e) => {
              setState({ keyword: e.target.value })
            }}
          />
        </div>
        <AButton
          icon={<PlusOutlined />}
          type={'primary'}
          onClick={() => {
            setState({
              selectedMemberId: null,
              openAddMember: true
            })
          }}
        >
          成员
        </AButton>
      </TableHeader>
      <Table
        size={'small'}
        dataSource={state.data}
        bordered={true}
        rowKey={'id'}
        pagination={false}
        columns={[
          {
            title: '成员名',
            dataIndex: 'name',
            render: (value, record) => (
              <div className={'flex items-center gap-2'}>
                {value}
                {record.root && (
                  <Tooltip title={'超级管理员'}>
                    <KeyRound className='size-3.5 text-blue-500' />
                  </Tooltip>
                )}
              </div>
            )
          },
          {
            title: '邮箱',
            dataIndex: 'email',
            key: 'email'
          },
          {
            dataIndex: 'actions',
            key: 'actions',
            render: (_, record) => (
              <div className={'space-x-2'}>
                <Button
                  size={'icon-sm'}
                  variant={'outline'}
                  disabled={!hasAccess('manageMemberAndRole') || record.root!}
                  onClick={() => {
                    setState({
                      openAddMember: true,
                      selectedMemberId: record.id
                    })
                  }}
                >
                  <PencilLine />
                </Button>
                <Button
                  size={'icon-sm'}
                  variant={'outline'}
                  disabled={!hasAccess('manageMemberAndRole') || record.root!}
                  onClick={() => {
                    adminConfirmDialog$.next({
                      title: '提示',
                      content: '删除后，用户将立即退出系统，是否继续',
                      okButtonProps: { danger: true },
                      onOk: () => {
                        return trpc.manage.deleteMember
                          .mutate({
                            memberId: record.id
                          })
                          .catch((e) => {
                            toast.error(e.message)
                          })
                      }
                    })
                  }}
                >
                  <Trash className={'size-3'} />
                </Button>
              </div>
            )
          }
        ]}
      />
      <AddMember
        open={state.openAddMember}
        onUpdate={() => getMembers()}
        id={state.selectedMemberId || undefined}
        onClose={() => setState({ openAddMember: false })}
      />
    </div>
  )
})
