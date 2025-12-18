FROM node:22-alpine

RUN npm install -g pnpm@10.24.0

# 设置工作目录
WORKDIR /app

# 拷贝 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 使用 pnpm 安装生产依赖
RUN pnpm install --prod --frozen-lockfile && pnpm add drizzle-kit

# 拷贝已构建好的文件
COPY build ./build
COPY drizzle ./drizzle
COPY drizzle.config.ts ./drizzle.config.ts
COPY server.js ./
# COPY ecosystem.config.cjs ./

EXPOSE 3015

# 使用 pm2-runtime 启动应用
CMD pnpm drizzle-kit push --force && node server.js