## TeamChat

一个团队使用的大模型对话程序（开发中）。

## 特性

- 多平台接入

  - Open Ai
  - Anthropic
  - Deepseek
  - Qwen
  - Gemini
  - OpenRouter

- 支持多搜索引擎接入 （实时搜索增强大模型回答）

  - Google
  - Tavily
  - Exa
  - Bing

- 由后台配置 Api Key，成员仅需使用不在暴露 Api Key。
- 基于助手、成员、时间维度进行 Token 统计。
- 可添加知识库进行 RAG 对话。

  - 基于上传文件搭建知识库。
  - 基于在线文档站搭建知识库。

- 可添加基于 http 的自定义 tools 调用。
- 支持 PWA 安装至桌面和移动适配。
- 支持基于 OpenID Connect (OAuth2.0) 的 SSO 登录接入。
