import { Cacheable } from 'cacheable'
import { db, type DbInstance } from 'server/db'

export const cacheable = new Cacheable()

class CacheManage {
  constructor(
    private readonly cacheable: Cacheable,
    private readonly db: DbInstance
  ) {}
  async getUser(uid: number) {
    let user = await cacheable.get<{
      id: number
      root: boolean
    }>(`user:${uid}`)
    if (!user) {
      user = await this.db.query.users.findFirst({
        where: { id: uid, deleted: false },
        columns: { id: true, root: true }
      })
      if (user) {
        await this.cacheable.set(`user:${user.id}`, user, 60 * 60 * 12 * 1000)
      }
    }
    return user
  }
  setUser(user: { uid: number; root: boolean }) {
    return this.cacheable.set(`user:${user.uid}`, user, 60 * 60 * 12 * 1000)
  }
  deleteUser(uid: number) {
    return this.cacheable.delete(`user:${uid}`)
  }
  deleteTaskModel() {
    return this.cacheable.delete('taskModel')
  }
  async getTaskModel(rollback?: { assistantId: number; model: string }) {
    let taskModel = await this.cacheable.get<{
      id: number
      apiKey?: string
      mode: string
      baseUrl?: string
      taskModel: string
    }>('taskModel')
    if (!taskModel) {
      const assistant = await this.db.query.assistants.findFirst({
        where: { taskModel: { isNotNull: true } },
        columns: {
          id: true,
          apiKey: true,
          mode: true,
          baseUrl: true,
          taskModel: true
        }
      })
      if (assistant) {
        await this.cacheable.set('taskModel', assistant, 60 * 60 * 24 * 1000)
      } else if (rollback) {
        const data = await this.db.query.assistants.findFirst({
          where: { id: rollback.assistantId },
          columns: {
            id: true,
            apiKey: true,
            mode: true,
            baseUrl: true
          }
        })
        if (data) {
          return {
            ...data,
            taskModel: rollback.model
          }
        }
      }
      return assistant
    }
    return taskModel
  }
}

export const cacheManage = new CacheManage(cacheable, db)
