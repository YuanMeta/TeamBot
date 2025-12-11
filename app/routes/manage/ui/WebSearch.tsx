import { observer } from 'mobx-react-lite'
import googleIcon from '~/assets/google.png'
import exaIcon from '~/assets/exa.png'
import tavilyIcon from '~/assets/tavily.png'
import bochaIcon from '~/assets/bocha.png'
import zhipuIcon from '~/assets/zhipu.png'
import { useAccess } from '~/lib/access'
import { useLocalState } from '~/hooks/localState'
import { useCallback, useEffect } from 'react'
import { trpc } from '~/.client/trpc'
import { TableHeader } from './TableHeader'
import { Button, Table } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { IconButton } from '~/components/project/icon-button'
import { PencilLine, Trash } from 'lucide-react'
import { adminConfirmDialog$ } from '~/components/project/confirm-dialog'
import { toast } from 'sonner'
import type { WebSearchData } from 'server/db/type'
const searchModes = [
  {
    value: 'zhipu',
    label: '智谱搜索',
    icon: zhipuIcon
  },
  {
    value: 'bocha',
    label: '博查搜索',
    icon: bochaIcon
  },
  {
    value: 'google',
    label: 'Google',
    icon: googleIcon
  },
  {
    value: 'tavily',
    label: 'Tavily',
    icon: tavilyIcon
  },
  {
    value: 'exa',
    label: 'Exa',
    icon: exaIcon
  }
]

export const WebSearch = observer(() => {
  const { hasAccess } = useAccess()
  const [state, setState] = useLocalState({
    page: 1,
    pageSize: 10,
    keyword: '',
    openAddRole: false,
    selectedRoleId: null as null | number,
    data: [] as WebSearchData[],
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
        <Button
          disabled={!hasAccess('manageMemberAndRole')}
          icon={<PlusOutlined />}
          type={'primary'}
          onClick={() => {
            setState({ openAddRole: true, selectedRoleId: null })
          }}
        >
          搜索工具
        </Button>
      </TableHeader>
      <Table
        size={'small'}
        bordered={true}
        rowKey={'id'}
        pagination={false}
        columns={[
          {
            title: '名称',
            dataIndex: 'title'
          },
          {
            title: '备注',
            dataIndex: 'description',
            ellipsis: true
          },
          {
            title: '操作',
            dataIndex: 'actions',
            key: 'actions',
            render: (_, record) => {
              return (
                <div className={'space-x-2'}>
                  <IconButton
                    onClick={() => {
                      setState({
                        selectedRoleId: record.id,
                        openAddRole: true
                      })
                    }}
                  >
                    <PencilLine />
                  </IconButton>
                  <IconButton
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
                  </IconButton>
                </div>
              )
            }
          }
        ]}
        dataSource={state.data}
      />
    </div>
  )
})
