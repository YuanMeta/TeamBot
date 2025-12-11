import { type TRPCRouterRecord } from '@trpc/server'
import { assistantRouter } from './assistant'
import { memberRouter } from './member'
export const manageRouter = {
  ...assistantRouter,
  ...memberRouter
} satisfies TRPCRouterRecord
