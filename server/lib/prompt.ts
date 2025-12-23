import { convertToModelMessages, generateText, type UIMessage } from 'ai'
import { createClient } from './connect'
import { aesDecrypt, tid } from './utils'
import type { SearchResult, Usage } from 'types'
import dayjs from 'dayjs'

export const extractOrDetermineSearch = async ({
  assistant,
  model,
  query,
  historyQuery
}: {
  assistant: {
    mode: string
    apiKey?: string | null
    baseUrl?: string | null
  }
  model: string
  query: string
  historyQuery?: string[]
}): Promise<{
  query: {
    query?: string
    action: 'no_search' | 'search'
  }
  usage: Usage
}> => {
  const client = createClient({
    mode: assistant.mode,
    api_key: assistant.apiKey,
    base_url: assistant.baseUrl
  })!
  if (historyQuery?.length) {
    query = `[历史提问]:\n ${historyQuery
      ?.map((q) => `- ${q}`)
      .join('\n')}\n\n[当前提问]:${query}`
  }
  const message: UIMessage[] = [
    {
      id: tid(),
      role: 'user',
      parts: [{ type: 'text', text: query }]
    }
  ]
  const res = await generateText({
    model: client(model),
    system: `你的任务是判断用户提问是否需要联网搜索，如果需要则重写搜索查询语句。
当前时间：${dayjs().format('YYYY-MM-DD HH:mm')}
请严格遵循以下判断标准：

【必须搜索的情况】
- 问题涉及时效性信息（例如：当前时间、最近变化、最新版本、近期事件）
- 问题涉及不确定或易变的事实（价格、政策、发布状态、可用性）
- 问题需要引用具体来源、数据或现实世界验证
- 你无法仅凭通用知识给出高置信度答案
- 用户明确要求搜索

【不需要搜索的情况】
- 你已明确只晓的常识性问题
- 用户主观判断、观点、取舍分析
- 明确声明可基于已有知识回答的问题

输出要求：
- 如果【不需要搜索】，输出：
  { "action": "no_search" }

- 如果【需要搜索】，输出：
  {
    "action": "search",
    "query": "<重写后的搜索查询语句>"
  }

查询重写规则（仅在需要搜索时适用）：
- 查询语句必须是独立、完整、可直接用于搜索引擎的关键词或短句
- 补全省略的主语和上下文
- 明确时间、版本或对象
- 不要包含判断、解释或完整句子回答、符号等多余说明

只允许输出 JSON，不要输出任何额外文本。`,
    messages: await convertToModelMessages(message)
  })
  try {
    const query = JSON.parse(res.text)
    return { query, usage: res.usage }
  } catch (e) {
    return {
      query: {
        action: 'no_search'
      },
      usage: res.usage
    }
  }
}

export const compressSearchResults = async ({
  assistant,
  model,
  searchResults,
  query
}: {
  assistant: {
    mode: string
    apiKey?: string | null
    baseUrl?: string | null
  }
  model: string
  query: string
  searchResults: SearchResult[]
}) => {
  const client = createClient({
    mode: assistant.mode,
    api_key: assistant.apiKey,
    base_url: assistant.baseUrl
  })!
  query = `【搜索结果】\n${JSON.stringify(
    searchResults
  )}\n\n用户的问题是：${query}`
  const message: UIMessage[] = [
    {
      id: tid(),
      role: 'user',
      parts: [{ type: 'text', text: query }]
    }
  ]
  const res = await generateText({
    model: client(model),
    messages: await convertToModelMessages(message),
    system: `你是一个搜索结果压缩器。
【任务】
- 删除明显重复的信息片段
- 筛选并保留与主题直接相关的关键信息
- 识别并合并内容核心一致但表述不同的有效信息
- 在精简的同时，优先保留具体数据、方法、定义等可独立使用的实质性内容
- 避免因过度压缩而丢失支撑性事实和必要语境

【操作边界】
- 不对内容进行解释、推理或补充
- 不评价信息的真实性或重要性
- 不回答原始查询，仅整理提供的信息

【输出格式】
- 以条目清晰、信息完整的要点列表形式呈现，在列表前保留url，例如 1. [https://example.com]<主题内容>
- 确保条目间逻辑独立，不交叉
- 总条目数尽量控制在15-30条，以信息充分性为优先，可略微浮动
- 保留原文中的关键术语与精确表述`
  })
  return {
    summary: res.text,
    usage: res.usage
  }
}
