import type { SharedV2ProviderMetadata } from '@ai-sdk/provider'
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
