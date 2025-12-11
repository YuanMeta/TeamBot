import { Pagination, type PaginationProps } from 'antd'
import { observer } from 'mobx-react-lite'

export const TableHeader = observer(
  (props: { pagination: PaginationProps; children: React.ReactNode }) => {
    return (
      <div className={'flex items-center justify-between mb-2'}>
        <div className={'flex gap-2'}>{props.children}</div>
        <div>
          <Pagination
            size={'small'}
            showTotal={(total) => `共 ${total} 条记录`}
            {...props.pagination}
          />
        </div>
      </div>
    )
  }
)
