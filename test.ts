import OpenAI from 'openai'
const client = new OpenAI({
  // apiKey: 'bb3ba9b9-fe48-4048-9df0-8bc21af4fd9d',
  apiKey: 'sk-W31XBGVSAvsayQTWk29BXQrass9CymopBQvkth3hsWPehEWv',
  // baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  baseURL: 'https://api.moonshot.cn/v1',
  dangerouslyAllowBrowser: true
})

const stream = await client.chat.completions.create({
  model: 'kimi-k2-thinking',
  tools: [
    // {
    //   type: 'web_search',
    //   // @ts-ignore
    //   max_keyword: 3
    // }
    {
      // @ts-ignore
      type: 'builtin_function',
      function: {
        name: '$web_search'
      }
    }
  ],
  messages: [
    {
      role: 'system',
      content:
        '你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。'
    },
    { role: 'user', content: 'Mac book m6 pro 是否会涨价' }
  ],
  stream: true
})
for await (const event of stream) {
  console.log(JSON.stringify(event))
}
