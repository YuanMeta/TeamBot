import type { ChatStore } from '../../store/store'

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

export const chooseFile = (
  store: ChatStore,
  type: 'file' | 'image'
): Promise<File> => {
  return new Promise((resolve, reject) => {
    // store.api
    //   .showOpenDialog({
    //     canChooseFiles: true,
    //     allowsMultipleSelection: false,
    //     filters: [
    //       {
    //         name: 'extensions',
    //         extensions:
    //           type === 'file'
    //             ? ['pdf', 'doc', 'docx', ...programmingFileExtensions]
    //             : ['jpg', 'jpeg', 'png', 'webp']
    //       }
    //     ]
    //   })
    //   .then(async (res) => {
    //     if (res.success && res.filePaths.length > 0) {
    //       const file = res.filePaths[0]
    //       const base64 = await store.rpc.getFileBase64(file)
    //       const match = base64.data.base64.match(/^data:(.*?);base64,(.*)$/)
    //       if (!match) {
    //         reject(new Error('Invalid base64 format'))
    //         return
    //       }
    //       const mime = match[1]
    //       const b64data = match[2]
    //       const byteCharacters = atob(b64data)
    //       const byteNumbers = new Array(byteCharacters.length)
    //       for (let i = 0; i < byteCharacters.length; i++) {
    //         byteNumbers[i] = byteCharacters.charCodeAt(i)
    //       }
    //       const byteArray = new Uint8Array(byteNumbers)
    //       const fileName = file.split(/[\\/]/).pop() || 'file'
    //       const fileObj = new File([byteArray], fileName, { type: mime })
    //       resolve(fileObj)
    //     } else {
    //       reject()
    //     }
    //   })
  })
}
