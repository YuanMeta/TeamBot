import { type TRPCRouterRecord } from '@trpc/server'
import { assistantRouter } from './assistant'
import { memberRouter } from './member'
import { webSearchRouter } from './webSearch'
export const manageRouter = {
  ...assistantRouter,
  ...memberRouter,
  ...webSearchRouter
} satisfies TRPCRouterRecord
