import {
  convertToModelMessages,
  generateText,
  type LanguageModel,
  type UIMessage
} from 'ai'

const prompt = `You are an assistant helping to manage conversation context for a large language model. 
The conversation history is becoming too long and may exceed the context window limit.

Your task:
- Summarize the previous conversation into a concise and information-rich summary.
- Keep all essential facts, decisions, user goals, and relevant context for future reasoning.
- Remove small talk, unnecessary repetition, or irrelevant details.
- Use clear and compact language, ideally under 500-1000 tokens in length.
- The summary should preserve the meaning and flow of the conversation so that the next model input can continue seamlessly.

Output only the summarized version of the conversation.
`
export const compreToken = async (data: {
  model: LanguageModel
  messages: UIMessage[]
}) => {
  const res = await generateText({
    model: data.model,
    system: prompt,
    maxOutputTokens: 1000,
    messages: convertToModelMessages(data.messages)
  })
  return res.text
}
