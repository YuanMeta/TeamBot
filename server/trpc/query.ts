import type { Knex } from 'knex'
import { parseRecord } from 'server/lib/table'

export const getMessagesWithFiles = async (
  db: Knex,
  data: {
    chatId: string
    userId: string
    page: number
  }
) => {
  const messages = await db('messages')
    .where({ chat_id: data.chatId, user_id: data.userId })
    .select('*')
    .orderBy('created_at', 'asc')
  const files = await db('message_files').whereIn(
    'message_id',
    messages.map((message) => message.id)
  )
  return messages.map((message) => ({
    ...parseRecord(message),
    files: files.filter((file) => file.message_id === message.id)
  }))
}
