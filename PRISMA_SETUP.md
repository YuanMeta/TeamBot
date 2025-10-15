# Prisma ORM 设置说明

## 已完成的设置

✅ 安装了 Prisma CLI 和 Prisma Client  
✅ 初始化了 Prisma 项目  
✅ 配置了 SQLite 数据库连接  
✅ 创建了基础数据模型（User 和 Message）  
✅ 生成了 Prisma Client  
✅ 添加了数据库管理脚本

## 文件结构

```
├── prisma/
│   ├── schema.prisma    # Prisma 数据模型定义
│   ├── dev.db          # SQLite 数据库文件
│   └── seed.ts         # 种子数据文件
├── lib/
│   ├── prisma.ts       # Prisma Client 实例
│   └── db-example.ts   # 数据库操作示例
└── .env                # 环境变量配置
```

## 可用的 npm 脚本

- `pnpm db:generate` - 生成 Prisma Client
- `pnpm db:push` - 推送 schema 到数据库
- `pnpm db:migrate` - 创建并运行迁移
- `pnpm db:studio` - 打开 Prisma Studio（数据库管理界面）
- `pnpm db:seed` - 运行种子数据

## 数据模型

### User 模型

- `id`: 唯一标识符
- `email`: 邮箱地址（唯一）
- `name`: 用户名称（可选）
- `createdAt`: 创建时间
- `updatedAt`: 更新时间
- `messages`: 关联的消息列表

### Message 模型

- `id`: 唯一标识符
- `content`: 消息内容
- `role`: 消息角色（'user' | 'assistant' | 'system'）
- `userId`: 关联的用户ID
- `createdAt`: 创建时间
- `user`: 关联的用户信息

## 使用方法

### 1. 导入 Prisma Client

```typescript
import { prisma } from './lib/prisma'
```

### 2. 基本操作示例

```typescript
// 创建用户
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    name: '用户名'
  }
})

// 创建消息
const message = await prisma.message.create({
  data: {
    content: '你好！',
    role: 'user',
    userId: user.id
  }
})

// 查询用户及其消息
const userWithMessages = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
  include: {
    messages: true
  }
})
```

### 3. 使用服务类

```typescript
import { UserService, MessageService } from './lib/db-example'

// 创建用户
const user = await UserService.createUser('user@example.com', '用户名')

// 创建消息
const message = await MessageService.createMessage('你好！', 'user', user.id)

// 获取用户消息
const messages = await MessageService.getUserMessages(user.id)
```

## 下一步

1. 运行 `pnpm db:studio` 打开数据库管理界面
2. 根据需要修改 `prisma/schema.prisma` 中的数据模型
3. 运行 `pnpm db:push` 应用更改
4. 在应用中使用 Prisma Client 进行数据库操作
