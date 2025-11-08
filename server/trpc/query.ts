import type { Knex } from 'knex'
import { parseRecord } from 'server/lib/table'

export const getMessagesWithFiles = async (
  db: Knex,
  data: {
    chatId: string
    userId: string
    offset: number
  }
) => {
  const limit = 10
  const messages = await db('messages')
    .where({ chat_id: data.chatId, user_id: data.userId })
    .select('*')
    .offset(data.offset)
    .limit(limit)
    .orderBy('created_at', 'desc')
  const files = await db('message_files').whereIn(
    'message_id',
    messages.map((message) => message.id)
  )
  const list = messages.map((message) => ({
    ...parseRecord(message),
    files: files.filter((file) => file.message_id === message.id)
  }))
  return { messages: list, loadMore: list.length === limit }
}
