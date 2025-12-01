FROM node:22-alpine

RUN npm install -g pnpm@10.24.0 pm2

# 设置工作目录
WORKDIR /app

# 拷贝 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 使用 pnpm 安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 拷贝已构建好的文件
COPY build ./build
COPY server.js ./
COPY ecosystem.config.cjs ./
COPY .env ./.env

# 创建日志目录
RUN mkdir -p logs

EXPOSE 3000

# 使用 pm2-runtime 启动应用
CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]