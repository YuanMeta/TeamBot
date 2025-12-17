#!/bin/bash

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}开始设置 TeamBot 环境...${NC}"

# 检查 openssl 是否可用
check_openssl() {
    if command -v openssl &> /dev/null; then
        echo -e "${GREEN}✓ 检测到 openssl${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ 未找到 openssl，将使用备用方法生成密钥${NC}"
        return 1
    fi
}

# 1. 下载 docker-compose.yml 文件
echo -e "${YELLOW}正在下载 docker-compose.yml...${NC}"
curl -s -o docker-compose.yml https://raw.githubusercontent.com/YuanMeta/teambot/main/docker/docker-compose.yml

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ docker-compose.yml 下载成功${NC}"
else
    echo -e "${RED}✗ docker-compose.yml 下载失败${NC}"
    exit 1
fi

# 2. 生成安全的随机密钥（16位长度）
echo -e "${YELLOW}正在生成随机密钥（16位/32字符）...${NC}"

# 方法1: 首选使用 openssl
generate_secret_with_openssl() {
    openssl rand -hex 16 2>/dev/null
}

# 方法2: 使用 /dev/urandom（所有Linux都可用）
generate_secret_with_urandom() {
    head -c 16 /dev/urandom | xxd -p -c 32 2>/dev/null || \
    head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n' 2>/dev/null
}

# 方法3: 使用多种系统命令组合
generate_secret_compatible() {
    # 尝试多种方法
    local secret=""
    
    # 方法3.1: 使用 date + sha256
    secret=$(date +%s%N | sha256sum | base64 | head -c 32 2>/dev/null)
    if [ ${#secret} -eq 32 ]; then
        echo "$secret"
        return 0
    fi
    
    # 方法3.2: 使用 /proc/sys/kernel/random/uuid
    secret=$(cat /proc/sys/kernel/random/uuid 2>/dev/null | tr -d '-' | head -c 32)
    if [ ${#secret} -eq 32 ]; then
        echo "$secret"
        return 0
    fi
    
    # 方法3.3: 使用 pwgen（如果安装）
    if command -v pwgen &> /dev/null; then
        secret=$(pwgen -s 32 1 2>/dev/null)
        if [ ${#secret} -eq 32 ]; then
            echo "$secret"
            return 0
        fi
    fi
    
    # 方法3.4: 最后的方法 - 简单随机
    echo $(tr -dc 'a-f0-9' < /dev/urandom | head -c 32 2>/dev/null)
}

# 检查并生成密钥
if check_openssl; then
    # 使用 openssl
    APP_SECRET=$(generate_secret_with_openssl)
    COOKIE_SECRET=$(generate_secret_with_openssl)
else
    # 使用兼容方法
    echo -e "${YELLOW}正在使用兼容模式生成密钥...${NC}"
    APP_SECRET=$(generate_secret_compatible)
    COOKIE_SECRET=$(generate_secret_compatible)
    
    # 确保两个密钥不同
    if [ "$APP_SECRET" = "$COOKIE_SECRET" ]; then
        sleep 1  # 等待1秒让随机种子变化
        COOKIE_SECRET=$(generate_secret_compatible)
    fi
fi

# 验证密钥是否生成成功
if [ -z "$APP_SECRET" ] || [ -z "$COOKIE_SECRET" ]; then
    echo -e "${RED}✗ 密钥生成失败，请手动设置：${NC}"
    echo -e "APP_SECRET=your-app-secret-here"
    echo -e "COOKIE_SECRET=your-cookie-secret-here"
    exit 1
fi

# 确保密钥是32字符（16字节）
if [ ${#APP_SECRET} -ne 32 ]; then
    echo -e "${YELLOW}⚠ APP_SECRET 长度不正确 (${#APP_SECRET})，进行调整...${NC}"
    APP_SECRET="${APP_SECRET}00000000000000000000000000000000"
    APP_SECRET=${APP_SECRET:0:32}
fi

if [ ${#COOKIE_SECRET} -ne 32 ]; then
    echo -e "${YELLOW}⚠ COOKIE_SECRET 长度不正确 (${#COOKIE_SECRET})，进行调整...${NC}"
    COOKIE_SECRET="${COOKIE_SECRET}00000000000000000000000000000000"
    COOKIE_SECRET=${COOKIE_SECRET:0:32}
fi

echo -e "${GREEN}✓ 16位随机密钥生成成功${NC}"
echo -e "${YELLOW}使用的生成方法：$(check_openssl && echo "openssl" || echo "兼容模式")${NC}"

# 3. 创建 .env 文件
echo -e "${YELLOW}正在创建 .env 文件...${NC}"

cat > .env << EOF
# PostgreSQL 数据库配置
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=teambot
POSTGRES_PORT=5432

# 应用配置
NODE_ENV=production
PORT=3000

# 数据库连接URL
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/teambot

APP_SECRET=$APP_SECRET
COOKIE_SECRET=$COOKIE_SECRET
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ .env 文件创建成功${NC}"
    
    # 显示生成的密钥信息
    echo -e "${YELLOW}生成的密钥信息：${NC}"
    echo -e "APP_SECRET:    $APP_SECRET"
    echo -e "COOKIE_SECRET: $COOKIE_SECRET"
else
    echo -e "${RED}✗ .env 文件创建失败${NC}"
    exit 1
fi

# 4. 设置文件权限
chmod 600 .env 2>/dev/null && echo -e "${GREEN}✓ 已设置 .env 文件权限${NC}"

echo -e "\n${GREEN}✅ 设置完成！${NC}"