import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef
} from '@tanstack/react-table'
import { PencilLine, Trash } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useMemo } from 'react'
import { trpc } from '~/.client/trpc'
import { Button } from '~/components/ui/button'
import { Button as AButton, Table } from 'antd'
import { useLocalState } from '~/hooks/localState'
import { AddSsoProvider } from './AddSsoProvider'
import { useAccess } from '~/lib/access'
import type { AuthProviderData } from 'server/db/type'
import { PlusOutlined } from '@ant-design/icons'
import { adminConfirmDialog$ } from '~/components/project/confirm-dialog'

export const SSO = observer(() => {
  const { hasAccess } = useAccess()
  const columns: ColumnDef<AuthProviderData>[] = useMemo(() => {
    return [
      {
        accessorKey: 'name',
        header: '名称',
        cell: ({ row }) => (
          <div className='capitalize'>{row.getValue('name')}</div>
        )
      },
      {
        accessorKey: 'scopes',
        header: 'scopes',
        cell: ({ row }) => (
          <div className='capitalize'>{row.getValue('scopes')}</div>
        )
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const data = row.original
          return (
            <div className={'flex gap-2'}>
              <Button
                variant='outline'
                size='icon-sm'
                disabled={!hasAccess('manageSso')}
                onClick={() => {
                  setState({
                    selectedSsoProviderId: data.id,
                    openAddSsoProvider: true
                  })
                }}
              >
                <PencilLine className={'size-3'} />
              </Button>
              <Button
                variant='outline'
                size='icon-sm'
                disabled={!hasAccess('manageSso')}
              >
                <Trash className={'size-3'} />
              </Button>
            </div>
          )
        }
      }
    ] as ColumnDef<AuthProviderData>[]
  }, [])
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

  const table = useReactTable({
    data: state.data,
    columns,
    getCoreRowModel: getCoreRowModel()
  })
  return (
    <div>
      <div className={'flex items-center justify-between mb-2'}>
        <div></div>
        <div>
          <AButton
            icon={<PlusOutlined />}
            onClick={() => {
              setState({
                openAddSsoProvider: true,
                selectedSsoProviderId: null
              })
            }}
          >
            SSO
          </AButton>
        </div>
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
            title: 'actions',
            dataIndex: 'actions',
            key: 'actions',
            render: (value, record) => {
              return (
                <div className={'flex gap-2'}>
                  <Button
                    variant='outline'
                    size='icon-sm'
                    disabled={!hasAccess('manageSso')}
                    onClick={() => {
                      setState({
                        selectedSsoProviderId: record.id,
                        openAddSsoProvider: true
                      })
                    }}
                  >
                    <PencilLine className={'size-3'} />
                  </Button>
                  <Button
                    variant='outline'
                    size='icon-sm'
                    disabled={!hasAccess('manageSso')}
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
                    <Trash className={'size-3'} />
                  </Button>
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
