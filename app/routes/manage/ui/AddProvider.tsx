import { observer } from 'mobx-react-lite'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { useForm } from '@tanstack/react-form'
import z from 'zod'
import { toast } from 'sonner'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '~/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea
} from '~/components/ui/input-group'
import { useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select'
import { ModelIcon } from '~/lib/ModelIcon'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerTitle
} from '~/components/ui/drawer'
import { ChevronLeft } from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(1, '请填写模型提供方名称'),
  mode: z.string().min(1, '请选择模型提供方'),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  models: z.array(z.string()).min(1, '请添加要使用的模型'),
  options: z.record(z.string(), z.string()).optional()
})

export const AddProvide = observer(
  (props: { open: boolean; onClose: () => void }) => {
    const form = useForm({
      defaultValues: {
        name: '',
        mode: 'openai'
      },
      validators: {
        onSubmit: formSchema
      },
      onSubmit: async ({ value }) => {
        toast('You submitted the following values:', {
          description: (
            <pre className='bg-code text-code-foreground mt-2 w-[320px] overflow-x-auto rounded-md p-4'>
              <code>{JSON.stringify(value, null, 2)}</code>
            </pre>
          ),
          position: 'bottom-right',
          classNames: {
            content: 'flex flex-col gap-2'
          },
          style: {
            '--border-radius': 'calc(var(--radius)  + 4px)'
          } as React.CSSProperties
        })
      }
    })
    return (
      // <Drawer
      //   open={props.open}
      //   onOpenChange={(open) => {
      //     if (!open) {
      //       props.onClose()
      //     }
      //   }}
      // >
      //   <DrawerContent className='sm:max-w-[500px]'>
      //     <DrawerHeader>
      //       <DrawerTitle>模型提供方</DrawerTitle>
      //       <DrawerDescription>接入任意模型提供方开启对话。</DrawerDescription>
      //     </DrawerHeader>
      <div className={'px-1 max-w-[500px] mx-auto pt-5'}>
        <Button variant={'outline'} className={'mb-5'} onClick={props.onClose}>
          <ChevronLeft />
          返回
        </Button>
        <form
          id='bug-report-form'
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field
              name='name'
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Bug Title</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder='Login button not working on mobile'
                      autoComplete='off'
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            />
            <form.Field
              name='mode'
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        // field.onChange(value)
                        // form.setValue('models', [])
                        // form.setValue(
                        //   'options.searchMode',
                        //   value === 'openrouter' ? 'openrouter' : ''
                        // )
                        // form.clearErrors('apiKey')
                      }}
                    >
                      <SelectTrigger className={'w-full'}>
                        <SelectValue placeholder='OpenRouter' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='openrouter'>
                          <ModelIcon mode='openrouter' size={20} />
                          OpenRouter
                        </SelectItem>
                        <SelectItem value='openai'>
                          <ModelIcon mode='openai' size={20} />
                          OpenAI
                        </SelectItem>
                        <SelectItem value='ollama'>
                          <ModelIcon mode='ollama' size={20} />
                          Ollama
                        </SelectItem>
                        <SelectItem value='gemini'>
                          <ModelIcon mode='gemini' size={20} />
                          Gemini
                        </SelectItem>
                        <SelectItem value='deepseek'>
                          <ModelIcon mode='deepseek' size={20} />
                          DeepSeek
                        </SelectItem>
                        <SelectItem value='qwen'>
                          <ModelIcon mode='qwen' size={20} />
                          Qwen
                        </SelectItem>
                        <SelectItem value='lmstudio'>
                          <ModelIcon mode='lmstudio' size={20} />
                          LmStudio
                        </SelectItem>
                        <SelectItem value='anthropic'>
                          <ModelIcon mode='anthropic' size={20} />
                          Anthropic
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            />
          </FieldGroup>
        </form>
      </div>
    )
  }
)
