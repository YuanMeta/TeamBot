import { db, type DbInstance } from 'server/db'
import {
  experimental_createMCPClient as createMCPClient,
  type experimental_MCPClient as MCPClient
} from '@ai-sdk/mcp'
import type { ToolSet } from 'ai'
import type { MCPParams } from 'server/db/type'

class MCPManager {
  private mcps: Record<string, MCPClient> = {}
  constructor(private readonly db: DbInstance) {
    this.init()
  }
  private async init() {
    const mcps = await this.db.query.tools.findMany({
      where: {
        type: 'mcp'
      },
      with: {
        assistants: {
          columns: { id: true }
        }
      }
    })
    for (const mcp of mcps) {
      const params = mcp.params?.mcp!
      if (params && mcp.assistants.length) {
        try {
          const client = await createMCPClient({
            transport: {
              type: params.type || 'http',
              url: params.url
            }
          })
          this.mcps[mcp.id] = client
        } catch (e) {
          console.error(e)
        }
      }
    }
  }
  async addMcp(ids: string[]) {
    const mcps = await this.db.query.tools.findMany({
      where: { id: { in: ids } },
      with: {
        assistants: {
          columns: { id: true }
        }
      }
    })
    if (mcps.length) {
      for (const mcp of mcps) {
        const params = mcp.params?.mcp!
        if (!this.mcps[mcp.id] && params) {
          try {
            const client = await createMCPClient({
              transport: {
                type: params.type || 'http',
                url: params.url
              }
            })
            this.mcps[mcp.id] = client
          } catch (e) {
            console.error(e)
          }
        }
      }
    }
  }
  async disconnect(id: string) {
    const client = this.mcps[id]
    if (client) {
      await client.close()
      delete this.mcps[id]
    }
  }
  async connectTest(params: MCPParams) {
    const client = await createMCPClient({
      transport: {
        type: params.type || 'http',
        url: params.url
      }
    })
    await client.close()
  }
  async getTools(id: string): Promise<ToolSet> {
    try {
      const client = this.mcps[id]
      if (client) {
        return await client.tools()
      }
      return {}
    } catch (e) {
      console.error(e)
      return {}
    }
  }
}

export const mcpManager = new MCPManager(db)
