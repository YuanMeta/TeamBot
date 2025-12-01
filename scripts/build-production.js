#!/usr/bin/env node

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import archiver from 'archiver'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🚀 开始生产环境构建...\n')

// 1. 执行构建
console.log('📦 步骤 1/4: 执行 npm run build...')
try {
  execSync('npm run build', {
    cwd: rootDir,
    stdio: 'inherit'
  })
  console.log('✅ 构建完成\n')
} catch (error) {
  console.error('❌ 构建失败:', error.message)
  process.exit(1)
}

// 2. 创建临时目录
const tempDir = path.join(rootDir, '.temp-build')
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true })
}
fs.mkdirSync(tempDir, { recursive: true })

console.log('📝 步骤 2/4: 准备生产环境文件...')

const filesToCopy = [
  'build',
  'server.js',
  'public',
  'ecosystem.config.cjs',
  '.env.template',
  'package.json',
  'pnpm-lock.yaml',
  'scripts/docker-start.sh',
  'scripts/docker-stop.sh',
  'scripts/docker-health-check.sh',
  'scripts/docker-start-standalone.sh',
  'scripts/docker-stop-standalone.sh',
  'scripts/generate-secrets.sh',
  'Dockerfile',
  '.dockerignore',
  'docker-compose.yml',
  'docker-compose-standalone.yml',
  'README.md',
  'LICENSE'
]

filesToCopy.forEach((item) => {
  const srcPath = path.join(rootDir, item)
  const destPath = path.join(tempDir, item)

  if (fs.existsSync(srcPath)) {
    if (fs.statSync(srcPath).isDirectory()) {
      copyRecursive(srcPath, destPath)
      console.log(`  ✓ 已复制目录: ${item}`)
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true })
      fs.copyFileSync(srcPath, destPath)
      console.log(`  ✓ 已复制文件: ${item}`)
    }
  } else {
    console.log(`  ⚠ 跳过不存在的文件: ${item}`)
  }
})

const packageJsonPath = path.join(rootDir, 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

const prodPackageJson = {
  ...packageJson,
  scripts: {
    start: packageJson.scripts.start
  }
}

fs.writeFileSync(
  path.join(tempDir, 'package.json'),
  JSON.stringify(prodPackageJson, null, 2),
  'utf-8'
)

console.log('  ✓ 已创建生产环境 package.json (不含 devDependencies)\n')

// 5. 创建 tar.gz 压缩文件
console.log('📦 步骤 3/4: 打包生产环境文件...')

const outputPath = path.join(rootDir, 'production-build.tar.gz')

if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath)
}

const output = fs.createWriteStream(outputPath)
const archive = archiver('tar', {
  gzip: true,
  gzipOptions: { level: 9 }
})

output.on('close', () => {
  const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2)
  console.log(`✅ 打包完成: ${sizeInMB} MB\n`)

  // 6. 清理临时目录
  console.log('🧹 步骤 4/4: 清理临时文件...')
  fs.rmSync(tempDir, { recursive: true, force: true })
  console.log('✅ 清理完成\n')

  console.log('🎉 生产环境构建成功!')
  console.log(`📦 输出文件: ${outputPath}`)
  console.log('\n💡 解压命令:')
  console.log('  tar -xzf production-build.tar.gz')
})

archive.on('error', (err) => {
  console.error('❌ 打包失败:', err)
  process.exit(1)
})

archive.pipe(output)
archive.directory(tempDir, false)
archive.finalize()

// 递归复制目录的辅助函数
function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}
