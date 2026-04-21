---
name: "linyu-project-conventions"
description: "Defines coding conventions, tech stack, and architecture rules for the linyu-client project. Invoke when writing or modifying code in this project to ensure consistency."
---

# 林语客户端项目规范

本项目是林语（Linyu）即时通讯桌面客户端，基于 Tauri 2 + Vue 3 + TypeScript 构建。所有代码编写和修改必须遵循以下规范。

## 一、技术栈

### 前端核心
- **框架**: Vue 3.5+（Composition API + `<script setup>`）
- **语言**: TypeScript 6+（strict 模式）
- **构建**: Vite 8+
- **包管理**: pnpm（禁止使用 npm/yarn）

### UI / 样式
- **组件库**: Naive UI 2.44+（自动按需导入，无需手动 import）
- **原子化 CSS**: UnoCSS（preset-wind3，即 Tailwind CSS 兼容模式）
- **CSS 预处理**: Sass/SCSS（scoped 样式）
- **图标**: SVG sprite（vite-plugin-svg-icons，通过 `<svg><use href="#iconName"></use></svg>` 引用）

### 状态管理
- **Pinia 3**（Options API 风格 Store：`state` + `actions`，无 getters）
- **pinia-plugin-persistedstate**：自动持久化
- **pinia-shared-state**：跨 Tauri 窗口状态共享

### 桌面框架
- **Tauri 2**：多窗口架构，Rust 后端
- **HTTP**: `@tauri-apps/plugin-http`（禁止使用 axios）

### 其他
- **路由**: Vue Router 5（HTML5 History 模式）
- **国际化**: vue-i18n 11（中英文双语）
- **工具库**: @vueuse/core、mitt
- **代码质量**: Biome（JS/TS/JSON）+ Prettier（Vue SFC）+ vue-tsc

## 二、代码风格

### 格式化规则
| 规则 | 值 |
|------|-----|
| 缩进 | 2 空格 |
| 引号 | 单引号 |
| 分号 | 不添加（asNeeded） |
| 尾逗号 | 无 |
| 行宽 | 120 字符 |
| 箭头函数参数括号 | 始终添加 |
| Vue SFC 缩进 | `<script>` 和 `<style>` 标签内容缩进 |

### TypeScript 规则
- **strict 模式**：开启所有严格检查
- **noUnusedLocals / noUnusedParameters**：报错
- **允许 `any`**：Biome 中 `noExplicitAny` 已关闭，但应尽量避免
- **JSX**: `jsxImportSource: "vue"`

### 命名规范

#### 文件命名
| 类别 | 风格 | 示例 |
|------|------|------|
| 通用组件 | PascalCase | `LinyuEmpty.vue`、`SvgIconButton.vue` |
| 页面入口 | index.vue | `homeWindow/index.vue` |
| 子页面 | kebab-case | `message.vue`、`contacts.vue` |
| 工具/服务 | camelCase.ts | `http.ts`、`i18n.ts` |
| Store | camelCase.ts | `global.ts`、`user.ts` |
| 类型文件 | camelCase.ts | `auth.ts`、`chat.ts` |

#### 组件命名
- 项目自有组件使用 **`Linyu` 前缀**：`LinyuEmpty`、`LinyuProvider`
- 通用功能组件无前缀：`SvgIconButton`、`ToolBar`
- 模板中一律使用 **PascalCase**：`<ToolBar>`、`<SvgIconButton>`

#### 类型命名
- 对象类型使用 **`interface`**（不使用 `type`，联合类型除外）
- 请求参数以 **`Param`** 后缀：`AccountLoginParam`
- 响应结果以 **`Result`** 后缀：`LoginResult`
- Store state 类型以 **`Store`** 后缀：`GlobalStore`（文件内 `type` 定义，不单独导出）

#### CSS 命名
- SCSS 类名使用 **BEM 简化版**（`block__element`，不使用 `--modifier`）
- CSS 变量命名：`--{类别}-{属性}-{修饰}`，如 `--primary-color`、`--bg-secondary-color`

### 导入规范
- 项目内模块使用 **`@/` 绝对路径**：`import { useUserStore } from '@/stores/user'`
- 禁止使用 `~/` 别名（虽然已配置但未使用）
- Vue 核心 API（`ref`、`computed`、`onMounted` 等）**无需手动 import**（自动导入）
- Naive UI 组件**无需手动 import**（自动注册）
- Naive UI 组合式函数（`useMessage`、`useDialog` 等）**无需手动 import**（自动导入）

## 三、Vue 组件规范

### 必须使用 Composition API + `<script setup>`
```vue
<!-- 正确 -->
<script setup lang="ts">
  const count = ref(0)
</script>

<!-- 错误：禁止使用 Options API -->
<script>
export default { data() { return { count: 0 } } }
</script>
```

### 包含 JSX/TSX 的组件使用 `<script setup lang="tsx">`
```vue
<script setup lang="tsx">
  const renderMessage = () => <span>{t('message.text')}</span>
</script>
```

### 样式使用双重体系
- **UnoCSS 原子类**：用于快速布局、间距、字体大小（`flex`、`items-center`、`m-l-10px`、`text-14px`）
- **SCSS scoped 样式**：用于组件核心结构和主题变量引用
- 主题色通过 CSS 变量引用：`var(--primary-color)`、`var(--bg-primary-color)`
- UnoCSS 中引用 CSS 变量：`from-[var(--primary-color)]`

### 组件通信
- **父子通信**: `defineProps` + `withDefaults` + `defineEmits`
- **全局状态**: Pinia Store（禁止使用 provide/inject）
- **跨窗口通信**: Tauri 事件系统（`emit`/`once`/`listen`）

## 四、状态管理规范

### Store 结构（Options API 风格）
```typescript
export const useXxxStore = defineStore('xxx', {
  persist: true,
  share: { enable: true, initialize: true },
  state: (): XxxStore => ({
    // 状态定义
  }),
  actions: {
    // 方法定义
  }
})
```

### 状态修改必须使用 `$patch`
```typescript
// 正确
setField(value: string) {
  this.$patch((state) => {
    state.field = value
  })
}

// 错误：禁止直接赋值
setField(value: string) {
  this.field = value
}
```

### Store 规则
- 所有 Store 必须配置 `persist: true`
- 所有 Store 必须配置 `share: { enable: true, initialize: true }`
- 不使用 `getters`，需要派生状态时在组件内使用 `computed`

## 五、API 调用规范

### HTTP 封装
- 使用 `@/utils/http.ts` 中的 `get` / `post` 方法
- 禁止使用 axios 或其他 HTTP 库
- 所有 API 返回 `ApiResponse<T>` 泛型接口

### API 模块化组织
- 每个业务领域一个文件：`api/auth.ts`、`api/chat.ts`、`api/user.ts` 等
- 通过命名导出函数
- 在 `api/index.ts` 中使用 `import * as` 聚合导出
- 组件中通过 `import { xxxApi } from '@/api'` 使用

### API 调用模式（Promise .then()）
```typescript
xxxApi.method(params).then((res) => {
  if (res.code === 0 && res.data) {
    // 成功处理
  } else {
    window.$message.error(res.msg)
  }
})
```

- 统一使用 **Promise `.then()`** 链式调用（不使用 async/await）
- 统一判断 `res.code === 0` 表示成功
- 失败时使用 `window.$message.error(res.msg)` 显示错误消息

### 类型定义
- API 请求/响应类型定义在 `src/types/api/` 目录
- Tauri 命令类型定义在 `src/types/cmd/` 目录
- 统一响应结构：
```typescript
export interface ApiResponse<T = any> {
  code: number
  msg: string
  data?: T
}
```

## 六、项目目录结构规范

```
src/
├── api/            # API 接口层（按业务领域分文件）
├── assets/         # 静态资源（fonts/、icons/）
├── components/     # 公共组件（PascalCase 命名）
├── constants/      # 常量/枚举定义
├── locales/        # 国际化语言包（zh.json、en.json）
├── router/         # 路由配置
├── services/       # 服务层（i18n 等）
├── stores/         # Pinia 状态管理
├── styles/         # 全局样式 + 主题
├── types/          # TypeScript 类型定义
│   ├── api/        # API 相关类型
│   └── cmd/        # Tauri 命令类型
├── typings/        # 自动生成的类型声明（勿手动修改）
├── utils/          # 工具函数（按功能域分文件）
└── views/          # 页面视图
    └── {windowName}Window/  # 窗口目录（Window 后缀）
        ├── index.vue        # 窗口主页面
        └── pages/           # 子页面（kebab-case）
```

### 新增文件放置规则
- 新 API 接口 → `src/api/` 下新建或追加文件
- 新类型定义 → `src/types/api/` 或 `src/types/cmd/`
- 新 Store → `src/stores/`
- 新工具函数 → `src/utils/`（按功能域分文件）
- 新窗口 → `src/views/{windowName}Window/`
- 新子页面 → 对应窗口的 `pages/` 目录
- 新公共组件 → `src/components/`
- SVG 图标 → `src/assets/icons/`

## 七、国际化规范

- 所有用户可见文本必须通过 i18n 引用，禁止硬编码中文或英文
- 使用方式：`{{ t('key.path') }}` 或 JSX 中 `{t('key.path')}`
- 语言包文件：`src/locales/zh.json` 和 `src/locales/en.json`
- 复杂插值使用 `<i18n-t>` 组件
- 响应式场景使用函数式：`label: () => t('key.path')`

## 八、Tauri 多窗口架构规范

### 窗口管理
- 窗口操作使用 `@/utils/window.ts` 封装的方法
- 禁止直接使用 Tauri 窗口 API，必须通过工具函数
- 新窗口需在 `utils/window.ts` 中添加创建方法

### 跨窗口通信
- 状态共享：通过 Pinia Store + `pinia-shared-state`
- 事件通信：通过 Tauri 事件系统（`emit`/`once`/`listen`）
- 禁止使用 localStorage 直接跨窗口通信

### Tauri 命令
- Rust 端命令定义在 `src-tauri/src/cmd.rs`
- 前端通过 `invoke('commandName', args)` 调用
- 命令参数/返回类型定义在 `src/types/cmd/`

## 九、Git 提交规范

### Conventional Commits
```
<type>(<scope>): <subject>

[body]
```

**允许的类型**: `feat`、`fix`、`docs`、`style`、`refactor`、`perf`、`test`、`build`、`ci`、`revert`、`chore`

**scope**: 从 `src/` 子目录自动提取（如 `api`、`components`、`stores`、`views` 等）

**header 最大长度**: 120 字符

### 提交前自动检查
- **pre-commit**: lint-staged（Biome + Prettier + vue-tsc 类型检查）
- **commit-msg**: commitlint 检查提交信息格式

## 十、Rust 后端规范

### 格式化
- 行宽: 100 字符
- 缩进: 4 空格
- 函数参数布局: Vertical
- 重排导入: 开启

### 错误处理
- 使用 `map_err(|e| e.to_string())` 统一错误转换
- Tauri 命令返回 `Result<T, String>`

## 十一、常见模式参考

### 新增 API 接口
```typescript
// src/api/example.ts
import { get, post } from '@/utils/http'
import type { ExampleParam, ExampleResult } from '@/types/api/example'

export function list(params: ExampleParam) {
  return get<ExampleResult>('/example/list', params)
}

export function create(data: ExampleParam) {
  return post<ExampleResult>('/example/create', data)
}
```

```typescript
// src/types/api/example.ts
export interface ExampleParam {
  field: string
}

export interface ExampleResult {
  id: string
  name: string
}
```

```typescript
// src/api/index.ts - 追加聚合导出
import * as exampleApi from './example'
export { exampleApi }
```

### 新增 Store
```typescript
// src/stores/example.ts
import { defineStore } from 'pinia'

type ExampleStore = {
  field: string
}

export const useExampleStore = defineStore('example', {
  persist: true,
  share: { enable: true, initialize: true },
  state: (): ExampleStore => ({
    field: ''
  }),
  actions: {
    setField(field: string) {
      this.$patch((state) => {
        state.field = field
      })
    }
  }
})
```

### 新增页面组件
```vue
<script setup lang="ts">
  import { xxxApi } from '@/api'
  import { useExampleStore } from '@/stores/example'

  const { t } = useI18n()
  const store = useExampleStore()
  const data = ref()

  onMounted(() => {
    xxxApi.list().then((res) => {
      if (res.code === 0 && res.data) {
        data.value = res.data
      } else {
        window.$message.error(res.msg)
      }
    })
  })
</script>

<template>
  <div class="h-100vh w-100vw">
    <!-- UnoCSS 原子类布局 -->
    <div class="flex items-center p-10px">
      <span class="text-14px">{{ t('example.title') }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .example {
    &__header {
      // SCSS BEM 结构样式
    }
  }
</style>
```

## 十二、禁止事项

1. **禁止**使用 Options API
2. **禁止**使用 axios（使用 `@tauri-apps/plugin-http`）
3. **禁止**在 Store 中直接赋值状态（必须使用 `$patch`）
4. **禁止**硬编码用户可见文本（必须走 i18n）
5. **禁止**使用 `~/` 路径别名（使用 `@/`）
6. **禁止**手动 import Vue 核心 API 和 Naive UI 组件（自动导入）
7. **禁止**在 Store 中使用 getters
8. **禁止**使用 provide/inject 进行全局状态共享（使用 Pinia）
9. **禁止**直接操作 Tauri 窗口 API（使用 `@/utils/window.ts` 封装）
10. **禁止**使用 async/await 调用 API（使用 Promise .then()）
