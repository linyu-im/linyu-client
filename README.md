<p align="center">
  <img src="./.preview/logo.png" alt="林语 Linyu" height="96" />
</p>

林语（Linyu）致力于打造**简单可部署、可自托管**的开源即时通讯方案——让个人、团队与企业都能轻松拥有一套数据可控、功能完整的沟通体系，覆盖桌面、移动等多端场景。本仓库为桌面端实现，基于 Tauri 2、Vue 3 与 TypeScript 构建。

[![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)](https://tauri.app/)
[![Vue](https://img.shields.io/badge/Vue-3-42b883?logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Version](https://img.shields.io/badge/version-2.0.1-blue)](./package.json)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)

**快速链接：** [组织主页](https://github.com/linyu-im) · [服务端](https://github.com/linyu-im/linyu-server) · [官网](https://linyu.chat)

---

## 项目介绍

林语希望降低自建 IM 的门槛：开源、部署路径清晰，配合服务端即可搭起属于自己的沟通环境，消息与文件留在你可控的基础设施上。客户端覆盖日常聊天、社交动态、云盘协作与 AI 工作助手，兼顾轻量使用与持续扩展。

本仓库是林语桌面客户端。完整使用需配合 [linyu-server](https://github.com/linyu-im/linyu-server) 部署；更多生态项目见 [linyu-im](https://github.com/linyu-im) 组织。

**核心亮点：**

- **即时沟通**：私聊 / 群聊，文本、图片、文件、语音、表情等多种消息，支持独立会话窗口
- **社交与组织**：通讯录、好友申请、群管理与群公告，以及「过往」动态
- **云盘协作**：文件浏览、传输任务、常见文件预览，方便资料沉淀与分享
- **可扩展能力**：应用中心支持安装插件，也可自行开发插件，持续丰富客户端能力
- **AI Work**：面向工作场景的助手对话、Skills 市场，敏感操作需确认后执行
- **音视频通话**：语音 / 视频实时沟通
- **桌面体验**：截图标注、托盘与消息提醒、深浅色主题、中英双语

---

## 支持平台

| 平台 | 说明 |
| --- | --- |
| Windows | 主要开发与日常验证平台（Windows 10 / 11） |
| macOS | 可基于 Tauri 2 构建，欢迎反馈兼容性问题 |
| Linux | 可基于 Tauri 2 构建，欢迎反馈兼容性问题 |
| 移动端 / Web | 规划中的多端能力，敬请期待；本仓库当前聚焦桌面端 |

---

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 桌面 | Tauri 2 |
| 前端 | Vue 3、TypeScript、Vite |
| UI | Naive UI、UnoCSS |
| 状态 | Pinia |
| 通信 / 音视频 | HTTP、WebSocket、LiveKit |
| 工程 | pnpm、vue-i18n（中 / 英） |

---

## 功能特性

### 账号

| 功能 | 说明 |
| --- | --- |
| 登录 / 注册 | 账号登录与新用户注册，快速进入工作区 |
| 登录历史 | 记住常用账号，切换更方便 |
| 会话锁定 | 临时离开时可锁定当前会话，降低误触与窥视风险 |

### 即时消息

| 功能 | 说明 |
| --- | --- |
| 私聊 / 群聊 | 一对一沟通与群组协作 |
| 消息类型 | 文本、图片、文件、语音、表情等 |
| 互动能力 | @ 提醒、引用回复、消息转发 |
| 多窗口 | 独立会话窗口，同时处理多个对话 |
| 记录与搜索 | 浏览历史消息，按关键字快速定位 |

### 通讯录与群

| 功能 | 说明 |
| --- | --- |
| 好友 | 搜索添加、申请处理、备注与标签 |
| 群聊 | 创建群聊、成员管理、管理员设置与群转让 |
| 群公告 | 发布与查看群内重要通知 |
| 资料卡片 | 便捷查看用户与群资料 |

### 过往

| 功能 | 说明 |
| --- | --- |
| 动态流 | 浏览好友分享的生活与工作动态 |
| 发布与互动 | 发布内容，支持点赞、评论等互动 |

### 云盘

| 功能 | 说明 |
| --- | --- |
| 文件管理 | 目录浏览与日常文件整理 |
| 传输列表 | 上传 / 下载进度与任务管理 |
| 文件预览 | 常见文档与媒体在线预览 |

### 应用中心

应用中心用于发现与管理插件：既可从市场安装现成能力，也可自行开发插件接入，持续丰富客户端应用生态。

| 功能 | 说明 |
| --- | --- |
| 插件市场 | 浏览、发现并安装可扩展能力 |
| 安装管理 | 安装、卸载与管理本地已装插件 |
| 自研扩展 | 支持开发自己的插件，按需扩展业务与工具场景 |

### AI Work

| 功能 | 说明 |
| --- | --- |
| 工作助手 | 面向文档、表格、图片与文件整理等场景的对话协助 |
| Skills 市场 | 为助手安装与扩展技能 |
| 权限确认 | 涉及本地操作等敏感步骤时，需你确认后再执行 |

### 音视频通话

| 功能 | 说明 |
| --- | --- |
| 语音通话 | 低干扰的实时语音沟通 |
| 视频通话 | 面对面的实时视频沟通 |

### 桌面体验

| 功能 | 说明 |
| --- | --- |
| 截图 | 桌面截图与简单标注 |
| 托盘与提醒 | 系统托盘常驻、消息提醒浮窗 |
| 设置中心 | 通知、快捷键、主题等个性化配置 |
| 心情 | 设置并展示个人心情状态 |
| 意见反馈 | 提交使用建议与问题反馈 |
| 国际化 | 中文 / 英文界面切换 |
| 主题 | 深色 / 浅色主题 |

---

## 项目预览

界面展示如下。更多能力请自行编译体验。

### 登录与注册

<p align="center">
  <img src="./.preview/login.png" alt="登录" height="280" style="border-radius: 6px; margin: 4px;" />
  <img src="./.preview/register.png" alt="注册" height="280" style="border-radius: 6px; margin: 4px;" />
</p>

### 消息与聊天

<p align="center">
  <img src="./.preview/chat-1.png" alt="聊天 1" height="220" style="border-radius: 6px; margin: 4px;" />
  <img src="./.preview/chat-2.png" alt="聊天 2" height="220" style="border-radius: 6px; margin: 4px;" />
  <img src="./.preview/chat-3.png" alt="聊天 3" height="220" style="border-radius: 6px; margin: 4px;" />
</p>

### 通讯录

<p align="center">
  <img src="./.preview/contacts.png" alt="通讯录" height="280" style="border-radius: 6px; margin: 4px;" />
  <img src="./.preview/contacts-group.png" alt="通讯录群聊" height="280" style="border-radius: 6px; margin: 4px;" />
</p>

### 过往

<p align="center">
  <img src="./.preview/moments.png" alt="过往" height="280" style="border-radius: 6px; margin: 4px;" />
  <img src="./.preview/moments-compose.png" alt="过往创建" height="280" style="border-radius: 6px; margin: 4px;" />
</p>

### 云盘

<p align="center">
  <img src="./.preview/cloud-drive.png" alt="云盘" height="220" style="border-radius: 6px; margin: 4px;" />
  <img src="./.preview/cloud-drive-transfers.png" alt="云盘传输列表" height="220" style="border-radius: 6px; margin: 4px;" />
  <img src="./.preview/cloud-drive-preview.png" alt="云盘文件预览" height="220" style="border-radius: 6px; margin: 4px;" />
</p>

### 应用中心

<p align="center">
  <img src="./.preview/application.png" alt="应用中心" height="240" style="border-radius: 6px; margin: 4px;" />
  <img src="./.preview/application-plugin.png" alt="应用中心插件" height="240" style="border-radius: 6px; margin: 4px;" />
</p>

### AI Work

<p align="center">
  <img src="./.preview/ai-work.png" alt="AI Work" height="220" style="border-radius: 6px; margin: 4px;" />
  <img src="./.preview/ai-work-chat.png" alt="AI Work 对话" height="220" style="border-radius: 6px; margin: 4px;" />
  <img src="./.preview/ai-work-skills-market.png" alt="AI Work Skills 市场" height="220" style="border-radius: 6px; margin: 4px;" />
</p>

### 音视频通话

<p align="center">
  <img src="./.preview/voice-call.png" alt="音频通话" height="240" style="border-radius: 6px; margin: 4px;" />
  <img src="./.preview/video-call.png" alt="视频通话" height="240" style="border-radius: 6px; margin: 4px;" />
</p>

### 聊天记录与搜索

<p align="center">
  <img src="./.preview/chat-history.png" alt="聊天记录" height="240" style="border-radius: 6px; margin: 4px;" />
  <img src="./.preview/chat-search.png" alt="记录搜索" height="240" style="border-radius: 6px; margin: 4px;" />
</p>

### 设置与其他

<p align="center">
  <img src="./.preview/settings.png" alt="设置" height="220" style="border-radius: 6px; margin: 4px;" />
  <img src="./.preview/emotion-settings.png" alt="心情设置" height="220" style="border-radius: 6px; margin: 4px;" />
  <img src="./.preview/feedback.png" alt="意见反馈" height="220" style="border-radius: 6px; margin: 4px;" />
</p>

### 浅色模式

<p align="center">
  <img src="./.preview/light-1.png" alt="浅色模式 1" height="160" style="border-radius: 6px; margin: 4px;" />
  <img src="./.preview/light-2.png" alt="浅色模式 2" height="160" style="border-radius: 6px; margin: 4px;" />
  <img src="./.preview/light-3.png" alt="浅色模式 3" height="160" style="border-radius: 6px; margin: 4px;" />
  <img src="./.preview/light-4.png" alt="浅色模式 4" height="160" style="border-radius: 6px; margin: 4px;" />
  <img src="./.preview/light-5.png" alt="浅色模式 5" height="160" style="border-radius: 6px; margin: 4px;" />
</p>

---

## 安装与运行

### 环境准备

- Node.js（建议 LTS）
- [pnpm](https://pnpm.io/)
- Rust 与 Tauri 开发环境（见 [Tauri 官方 Prerequisites](https://v2.tauri.app/start/prerequisites/)）

### 运行

```bash
# 克隆仓库
git clone https://github.com/linyu-im/linyu-client.git
cd linyu-client

# 安装依赖
pnpm install

# 开发模式
pnpm tauri dev

# 打包
pnpm tauri build
```

完整联调需配合 [linyu-server](https://github.com/linyu-im/linyu-server) 使用。更多说明也可关注 [官网](https://linyu.chat)。

---

## 相关仓库

| 仓库 | 说明 |
| --- | --- |
| [linyu-client](https://github.com/linyu-im/linyu-client) | 桌面客户端（本仓库） |
| [linyu-server](https://github.com/linyu-im/linyu-server) | 后端服务 |
| [linyu-plug-in](https://github.com/linyu-im/linyu-plug-in) | 插件相关 |

更多项目见 [linyu-im](https://github.com/linyu-im) 组织主页。

---

## 参与贡献

欢迎通过 Issue 反馈问题与建议，也欢迎提交 Pull Request，一起把林语做得更好用。

1. Fork 本仓库并创建功能分支
2. 完成本地开发与自测
3. 提交 PR，并简要说明改动动机与影响范围

请确保对本软件的使用与二次开发符合当地法律法规。

---

## 开源说明

本项目采用 [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0) 开源协议，与 [linyu-server](https://github.com/linyu-im/linyu-server) 保持一致。

完整许可文本见本仓库 [LICENSE](./LICENSE)，亦可参阅服务端许可说明：  
https://github.com/linyu-im/linyu-server/blob/main/LICENSE

在遵守 Apache License 2.0 的前提下，你可以自由地使用、修改与分发本软件；二次开发与商用时，请保留相应版权与许可声明，并遵守协议中的其他条款。

---

## 免责声明

> [!CAUTION]
> 请仅将本软件用于合法、合规的目的。林语团队不支持、不纵容任何未经授权访问、侵犯隐私或其他违法违规使用行为。因滥用本软件产生的一切后果，由使用者自行承担。

### 1. 基本声明

本软件作为开源项目提供。在法律允许的最大范围内，林语团队不对软件的功能性、安全性或适用性作出任何形式的保证，无论是明示的还是暗示的。

### 2. 使用风险

2.1 本软件按「现状」和「现有」基础提供，使用者需自行承担使用本软件的全部风险。  
2.2 林语团队不对软件的运行可靠性、适用性或与特定需求的兼容性提供任何保证。  
2.3 使用者应在充分评估风险的基础上决定是否使用本软件。

### 3. 责任限制

在任何情况下，林语团队及其关联方均不对因使用或无法使用本软件而导致的任何损失或损害承担责任，包括但不限于：

- 数据丢失或泄露
- 利润损失
- 系统中断
- 商业机会损失
- 其他直接、间接或衍生性损失

### 4. 用户义务

4.1 使用者应确保其对本软件的使用符合所有适用的法律法规要求。  
4.2 对本软件进行修改、分发或二次开发的使用者，需自行承担由此产生的全部责任，包括但不限于法律风险、知识产权风险、安全风险与数据保护责任。

### 5. 开发者权利

5.1 林语团队保留对本软件进行更新、修改、调整或停止维护的权利。  
5.2 林语团队可能在不事先通知的情况下修改本软件或相关服务。  
5.3 林语团队保留对本免责声明进行修改的权利。

### 6. 开源贡献

6.1 本软件欢迎社区贡献，但贡献者需遵守相关开源约定。  
6.2 林语团队不对第三方贡献的代码质量与安全性负责。

### 7. 其他

7.1 本免责声明的任何部分被认定为无效或不可执行时，其余部分仍然有效。  
7.2 本免责声明的最终解释权归林语团队所有。

---

如果林语对你有帮助，欢迎 Star 支持，也欢迎通过 Issue 交流想法与问题，谢谢。
