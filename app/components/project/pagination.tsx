import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useMemo } from 'react'

import { Button } from '~/components/ui/button'

export function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  showTotal
}: {
  total: number
  page: number
  pageSize: number
  showTotal?: boolean
  onPageChange: (pageIndex: number) => void
}) {
  const pages = useMemo(() => {
    let start = page - 3 < 1 ? 1 : page - 3
    let pageCount = Math.ceil(total / pageSize)
    let end = start + 6
    if (end > pageCount) {
      end = pageCount
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [total, pageSize, page])
  return (
    <div className='flex items-center justify-between px-2 my-3'>
      <div className='text-muted-foreground flex-1 text-sm'></div>
      <div className='flex items-center gap-1'>
        {!!showTotal && (
          <div className={'text-sm text-secondary-foreground/60 px-2'}>
            共 {total} 条记录
          </div>
        )}

        <Button
          variant='outline'
          size='icon-sm'
          disabled={page === 1}
          onClick={() => {
            onPageChange(page - 1)
          }}
        >
          <ChevronLeftIcon />
        </Button>
        {pages.map((page) => (
          <Button
            key={page}
            variant='outline'
            size='icon-sm'
            onClick={() => {
              onPageChange(page)
            }}
          >
            {page}
          </Button>
        ))}
        <Button
          variant='outline'
          size='icon-sm'
          disabled={page === pages.length || pages.length === 0}
          onClick={() => {
            onPageChange(page + 1)
          }}
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  )
}
