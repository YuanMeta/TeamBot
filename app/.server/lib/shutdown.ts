import { mcpManager } from './mcp'

export const gracefulShutdown = async () => {
  const timer = setTimeout(() => {
    console.error('清理超时，强制退出')
    process.exit(1)
  }, 5000)

  try {
    await mcpManager.disconnectAll()
    clearTimeout(timer)
    process.exit(0)
  } catch (err) {
    console.error('清理过程中出错:', err)
    process.exit(1)
  }
}
