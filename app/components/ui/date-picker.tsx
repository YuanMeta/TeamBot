'use client'

import * as React from 'react'
import { ChevronDownIcon } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { Calendar } from '~/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '~/components/ui/popover'

export function DatePicker(props: {
  value: Date | null
  onChange: (date: Date | null) => void
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className='flex flex-col gap-3'>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            id='date'
            className='w-48 justify-between font-normal'
          >
            {props.value ? props.value.toLocaleDateString() : '选择时间'}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto overflow-hidden p-0' align='start'>
          <Calendar
            mode='single'
            selected={props.value ?? undefined}
            captionLayout='dropdown'
            onSelect={(date) => {
              props.onChange(date ?? null)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
