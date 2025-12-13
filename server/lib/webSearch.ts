import type { AssistantData } from 'server/db/type'
import { generateText } from 'ai'
import { createClient } from './checkConnect'
import { aesDecrypt } from './utils'

export const extractOrDetermineSearch = async (
  assistant: AssistantData,
  model: string,
  query: string
) => {
  const client = createClient({
    mode: assistant.mode,
    api_key: assistant.apiKey ? await aesDecrypt(assistant.apiKey) : null,
    base_url: assistant.baseUrl
  })!

  const res = await generateText({
    model: client(model),
    prompt: `请判断以下用户问题是否需要通过网络搜索获取最新或外部信息才能准确回答。
判断标准：
需要搜索：问题涉及具体事实、数据、新闻、产品参数、政策、事件、时效信息（如“2025年”“最新”“是否已发布”）、地理位置、非常识性知识等；
不需要搜索：问题属于常识、数学计算、语言理解、主观意见、闲聊、假设性问题、已有明确答案的通用知识，或无法通过搜索回答的问题（如“你觉得我该怎么办？”）。
输出规则：
如果不需要搜索，请仅输出：no_need
如果需要搜索，请提取简洁、精准、适合用于网络搜索的主题，如果提问中涵盖多个主题，请分别提取，每行一个，不要解释或附加文字。
用户问题：「${query}」`
  })
  return {
    query: res.text?.includes('no_need')
      ? null
      : res.text.split(/\n+/).filter(Boolean),
    usage: res.usage
  }
}

export async function extractSearchQueries(
  assistant: AssistantData,
  model: string,
  query: string
) {
  const client = createClient({
    mode: assistant.mode,
    api_key: assistant.apiKey ? await aesDecrypt(assistant.apiKey) : null,
    base_url: assistant.baseUrl
  })!

  const res = await generateText({
    model: client(model),
    prompt: `请从以下用户问题中提取简洁、明确、适合用于网络搜索的主题，如果提问中涵盖多个主题，请分别提取。要求：
保留核心实体（如人名、地名、产品名、事件、年份等）；
去除主观性、模糊性语言（如“我觉得”“可能”“有没有推荐”等）；
使用中性、客观的措辞；
如果问题涉及多个独立主题，请分别提取；
输出格式：仅返回提取结果，每行一个，不要解释或附加文字。
用户问题：「${query}」`
  })
  return { query: res.text.split(/\n+/).filter(Boolean), usage: res.usage }
}
