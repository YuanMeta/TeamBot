import { fileOpen } from 'browser-fs-access'

const programmingFileExtensions = [
  '.py',
  '.pyi',
  '.pyx', // Python
  '.java', // Java（排除.class、.jar）
  '.c',
  '.h',
  '.C', // C语言
  '.cpp',
  '.cxx',
  '.cc',
  '.hpp', // C++
  '.js',
  '.jsx',
  '.mjs', // JavaScript/TypeScript
  '.ts',
  '.tsx',
  '.d.ts', // TypeScript
  '.cs',
  '.csproj', // C#
  '.php',
  '.php3',
  '.php4',
  '.php5',
  '.phtml', // PHP
  '.rb',
  '.rake',
  '.erb',
  '.slim', // Ruby
  '.swift',
  '.playground', // Swift
  '.go', // Go
  '.rs', // Rust
  '.kt',
  '.kts', // Kotlin
  '.scala',
  '.sc', // Scala
  '.pl',
  '.pm',
  '.t', // Perl
  '.sh',
  '.bash',
  '.zsh', // Shell
  '.sql',
  '.ddl',
  '.dml',
  '.plsql', // SQL/PLSQL
  '.dart', // Dart
  '.lua', // Lua
  '.R',
  '.r',
  '.rds', // R语言
  '.m',
  '.mlx', // MATLAB/Octave
  '.html',
  '.htm',
  '.css', // HTML/CSS
  '.jsx', // React JSX
  '.vue', // Vue.js
  '.hs',
  '.lhs', // Haskell
  '.ml',
  '.mli', // OCaml
  '.fs',
  '.fsi',
  '.fsx', // F#
  '.pro',
  '.pl', // Prolog
  '.erl',
  '.hrl', // Erlang
  '.ex',
  '.exs', // Elixir
  '.clj',
  '.cljs',
  '.cljc', // Clojure
  '.jl', // Julia
  '.asm',
  '.s', // 汇编语言
  '.d', // D语言
  '.zig', // Zig
  '.vim', // Vim脚本
  '.el', // Emacs Lisp
  '.hx', // Haxe
  '.coffee', // CoffeeScript
  '.sass',
  '.scss',
  '.less',
  '.styl', // CSS预处理器
  '.jinja', // Jinja模板
  '.ps1',
  '.psm1', // PowerShell
  '.vbs', // VBScript
  '.vb', // VB.NET
  '.f',
  '.f90',
  '.f95', // Fortran
  '.cob',
  '.cbl', // COBOL
  '.pas',
  '.p', // Pascal
  '.adb',
  '.ads', // Ada
  '.raku',
  '.pl6', // Raku（前称Perl6）
  '.thrift', // Thrift接口定义
  '.graphql',
  '.gql', // GraphQL
  '.sol', // Solidity（以太坊智能合约）

  // 配置与模板文件（非代码但相关）
  '.json', // JSON配置
  '.yaml',
  '.yml', // YAML配置
  '.xml', // XML配置/数据
  '.md',
  '.markdown', // Markdown文档
  '.ini', // INI配置
  '.properties' // Java属性文件
]

export const chooseFile = async () => {
  const file = await fileOpen({
    extensions: [
      '.csv',
      '.xlsx',
      '.xls',
      '.pdf',
      '.docx',
      ...programmingFileExtensions
    ],
    multiple: false
  })
  const extension = file.name.split('.').pop()
  if (programmingFileExtensions.includes(`.${extension}`)) {
    return {
      content: await file.text(),
      name: file.name
    }
  } else {
    try {
      if (/\.(pdf)$/.test(file.name)) {
        return import('./pdfParser').then(async ({ PDFParser }) => {
          const res = await PDFParser.parsePDF(file)
          return { content: res.text, name: file.name }
        })
      } else if (/\.(xlsx|xls|csv)$/.test(file.name)) {
        return import('./excelParser').then(async ({ excelToCsv }) => {
          const res = await excelToCsv(file, { format: 'markdown' })
          return {
            content: res.map((v) => v.content).join('\n\n'),
            name: file.name
          }
        })
      } else if (/\.docx$/.test(file.name)) {
        return import('./wordParser').then(async ({ WordParser }) => {
          return {
            content: await WordParser.processForLLM(file),
            name: file.name
          }
        })
      }
    } catch (error) {
      console.error(`Parse file ${file.name} error`, error)
      return { content: null, name: null }
    }
  }
  return { content: null, name: null }
}
