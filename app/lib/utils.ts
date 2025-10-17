import type { FieldApi } from '@tanstack/react-form'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isFormInValid = (field: any) => {
  return field.state.meta.isTouched && !field.state.meta.isValid
}
