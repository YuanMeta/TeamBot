import type { SharedV2ProviderMetadata } from '@ai-sdk/provider'
import { lazyValidator, zodSchema } from '@ai-sdk/provider-utils'
import z from 'zod'
import type { JSONValue } from '@ai-sdk/provider'
import type { UIMessageChunk } from 'ai'

export const jsonValueSchema: z.ZodType<JSONValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.string(),
    z.number(),
    z.boolean(),
    z.record(z.string(), jsonValueSchema),
    z.array(jsonValueSchema)
  ])
)

type ProviderMetadata = SharedV2ProviderMetadata
const providerMetadataSchema: z.ZodType<ProviderMetadata> = z.record(
  z.string(),
  z.record(z.string(), jsonValueSchema)
)

export type TemaMessageChunk =
  | UIMessageChunk
  | {
      type: 'source'
      sourceType?: string
      id: string
      url?: string
      mediaType?: string
      title?: string
      logo_url?: string
    }

export const uiMessageChunkSchema = lazyValidator(() =>
  zodSchema(
    z.union([
      z.strictObject({
        type: z.literal('text-start'),
        id: z.string(),
        providerMetadata: providerMetadataSchema.optional()
      }),
      z.strictObject({
        type: z.literal('text-delta'),
        id: z.string(),
        delta: z.string(),
        providerMetadata: providerMetadataSchema.optional()
      }),
      z.strictObject({
        type: z.literal('text-end'),
        id: z.string(),
        providerMetadata: providerMetadataSchema.optional()
      }),
      z.strictObject({
        type: z.literal('error'),
        errorText: z.string()
      }),
      z.strictObject({
        type: z.literal('tool-input-start'),
        toolCallId: z.string(),
        toolName: z.string(),
        providerExecuted: z.boolean().optional(),
        dynamic: z.boolean().optional()
      }),
      z.strictObject({
        type: z.literal('tool-input-delta'),
        toolCallId: z.string(),
        inputTextDelta: z.string()
      }),
      z.strictObject({
        type: z.literal('tool-input-available'),
        toolCallId: z.string(),
        toolName: z.string(),
        input: z.unknown(),
        providerExecuted: z.boolean().optional(),
        providerMetadata: providerMetadataSchema.optional(),
        dynamic: z.boolean().optional()
      }),
      z.strictObject({
        type: z.literal('tool-input-error'),
        toolCallId: z.string(),
        toolName: z.string(),
        input: z.unknown(),
        providerExecuted: z.boolean().optional(),
        providerMetadata: providerMetadataSchema.optional(),
        dynamic: z.boolean().optional(),
        errorText: z.string()
      }),
      z.strictObject({
        type: z.literal('tool-output-available'),
        toolCallId: z.string(),
        output: z.unknown(),
        providerExecuted: z.boolean().optional(),
        dynamic: z.boolean().optional(),
        preliminary: z.boolean().optional()
      }),
      z.strictObject({
        type: z.literal('tool-output-error'),
        toolCallId: z.string(),
        errorText: z.string(),
        providerExecuted: z.boolean().optional(),
        dynamic: z.boolean().optional()
      }),
      z.strictObject({
        type: z.literal('reasoning-start'),
        id: z.string(),
        providerMetadata: providerMetadataSchema.optional()
      }),
      z.strictObject({
        type: z.literal('reasoning-delta'),
        id: z.string(),
        delta: z.string(),
        providerMetadata: providerMetadataSchema.optional()
      }),
      z.strictObject({
        type: z.literal('reasoning-end'),
        id: z.string(),
        providerMetadata: providerMetadataSchema.optional()
      }),
      z.strictObject({
        type: z.literal('source-url'),
        sourceId: z.string(),
        url: z.string(),
        title: z.string().optional(),
        providerMetadata: providerMetadataSchema.optional()
      }),
      // 自定义，豆包source
      z.strictObject({
        type: z.literal('source'),
        sourceType: z.enum(['url', 'document']),
        id: z.string(),
        url: z.string(),
        mediaType: z.string().optional(),
        title: z.string().optional(),
        logo_url: z.string().optional()
      }),
      z.strictObject({
        type: z.literal('source-document'),
        sourceId: z.string(),
        mediaType: z.string(),
        title: z.string(),
        filename: z.string().optional(),
        providerMetadata: providerMetadataSchema.optional()
      }),
      z.strictObject({
        type: z.literal('file'),
        url: z.string(),
        mediaType: z.string(),
        providerMetadata: providerMetadataSchema.optional()
      }),
      z.strictObject({
        type: z.custom<`data-${string}`>(
          (value): value is `data-${string}` =>
            typeof value === 'string' && value.startsWith('data-'),
          { message: 'Type must start with "data-"' }
        ),
        id: z.string().optional(),
        data: z.unknown(),
        transient: z.boolean().optional()
      }),
      z.strictObject({
        type: z.literal('start-step')
      }),
      z.strictObject({
        type: z.literal('finish-step')
      }),
      z.strictObject({
        type: z.literal('start'),
        messageId: z.string().optional(),
        messageMetadata: z.unknown().optional()
      }),
      z.strictObject({
        type: z.literal('finish'),
        messageMetadata: z.unknown().optional()
      }),
      z.strictObject({
        type: z.literal('abort')
      }),
      z.strictObject({
        type: z.literal('message-metadata'),
        messageMetadata: z.unknown()
      })
    ])
  )
)
