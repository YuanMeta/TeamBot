import { PencilLine, Trash } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect } from 'react'
import { trpc } from '~/.client/trpc'
import { Button, Table } from 'antd'
import { useLocalState } from '~/hooks/localState'
import { AddSsoProvider } from './AddSsoProvider'
import { useAccess } from '~/lib/access'
import type { AuthProviderData } from 'server/db/type'
import { PlusOutlined } from '@ant-design/icons'
import { adminConfirmDialog$ } from '~/components/project/confirm-dialog'
import { IconButton } from '~/components/project/icon-button'

export const SSO = observer(() => {
  const { hasAccess } = useAccess()
  const [state, setState] = useLocalState({
    data: [] as AuthProviderData[],
    openAddSsoProvider: false,
    selectedSsoProviderId: null as null | number
  })
  const getProviders = useCallback(() => {
    trpc.manage.getAuthProviders.query().then((res) => {
      setState({ data: res as AuthProviderData[] })
    })
  }, [])

  useEffect(() => {
    getProviders()
  }, [])

  return (
    <div>
      <div className={'flex items-center justify-between mb-2'}>
        <Button
          type={'primary'}
          icon={<PlusOutlined />}
          disabled={!hasAccess('manageSso')}
          onClick={() => {
            setState({
              openAddSsoProvider: true,
              selectedSsoProviderId: null
            })
          }}
        >
          SSO
        </Button>
      </div>
      <Table
        size={'small'}
        bordered={true}
        rowKey={'id'}
        dataSource={state.data}
        columns={[
          {
            title: '名称',
            dataIndex: 'name',
            key: 'name'
          },
          {
            title: '描述',
            dataIndex: 'description',
            ellipsis: true,
            key: 'description'
          },
          {
            dataIndex: 'actions',
            title: '操作',
            key: 'actions',
            render: (value, record) => {
              return (
                <div className={'flex gap-2'}>
                  <IconButton
                    hidden={!hasAccess('manageSso')}
                    onClick={() => {
                      setState({
                        selectedSsoProviderId: record.id,
                        openAddSsoProvider: true
                      })
                    }}
                  >
                    <PencilLine className={'size-3'} />
                  </IconButton>
                  <IconButton
                    hidden={!hasAccess('manageSso')}
                    onClick={() => {
                      adminConfirmDialog$.next({
                        title: '提示',
                        content: '确定要删除该SSO提供者吗？',
                        onOk: () => {
                          return trpc.manage.deleteAuthProvider.mutate({
                            providerId: record.id
                          })
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
      />
      <AddSsoProvider
        onClose={() => setState({ openAddSsoProvider: false })}
        onUpdate={() => getProviders()}
        open={state.openAddSsoProvider}
        id={state.selectedSsoProviderId}
      />
    </div>
  )
})
