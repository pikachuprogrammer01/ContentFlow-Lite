# ContentFlow Lite 架构设计规范（Architecture Specification）

## 1. 项目概述

### 1.1 文档目的

本规范用于定义 ContentFlow Lite 的整体技术架构、模块职责、数据模型、接口约束以及开发规范。

PRD 用于描述产品需要实现哪些功能，而本规范用于定义这些功能应如何实现。所有开发工作均应遵循本规范，保证项目具有统一的数据结构、统一的业务流程和统一的开发标准。

当产品需求与技术实现发生冲突时，应以本规范中的架构约束为准，并通过调整实现方式满足产品需求。

***

### 1.2 适用范围

本规范适用于整个项目的所有核心模块，包括但不限于：

- 页面层（Presentation）
- Workflow Engine（工作流引擎）
- Prompt Builder（提示词构建器）
- Prompt Version（提示词版本管理）
- AI Provider（模型调用层）
- Parser（解析器）
- Content DTO（统一内容模型）
- Editor（编辑器）
- Exporter（导出模块）
- Storage / Repository（数据存储）
- Auth Module（认证模块）
- AdminJS Panel（数据库管理面板）
- Express API Layer（后端 API 层）

未来新增的任何模块，也必须遵循本规范定义的架构原则。

***

### 1.3 设计目标

整个系统围绕以下五个目标进行设计。

#### 一、统一的数据模型

整个系统只允许维护一套 Content DTO。

无论是 AI 返回的数据、编辑器的数据、导出的数据还是历史记录的数据，都必须基于同一个 Content DTO。

禁止多个模块维护不同的数据结构。

***

#### 二、统一的业务流程

Workflow Engine 是整个系统唯一的业务入口。

所有页面请求都必须经过 Workflow。

页面不得直接调用 AI、Parser 或 Exporter。

***

#### 三、统一的 Prompt 生命周期

每一次生成内容都必须记录：

- Prompt ID
- Prompt Version
- AI 模型
- 创建时间
- 平台信息

保证内容能够追踪、比较和复现。

***

#### 四、低耦合架构

所有模块均通过公开接口进行通信。

模块之间不得直接访问彼此内部实现。

任何模块发生修改，都不应影响其他模块。

***

#### 五、可扩展设计

整个系统应具备良好的扩展能力。

未来新增：

- AI 模型
- Prompt 模板
- 图片生成
- 批量生成
- 云端同步
- 插件系统

均不应修改现有核心架构。

***

# 2. 系统总体架构

整个系统采用分层架构设计，各模块职责单一，由 Workflow Engine 串联整个业务流程。

整体架构如下：

```text
                         用户
                          │
                          ▼
            ┌──────── 页面（UI）─────────┐
            │    (Vue 3 + Pinia + Router) │
            │    LoginPage / SettingsPage │
            └─────────────┬───────────────┘
                          │
                          ▼
              ┌── Express API Layer ──┐
              │  JWT Auth Middleware  │
              └───────────┬───────────┘
                          │
                          ▼
                 Workflow Engine
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
 Prompt Builder      AI Provider       Storage
        │                 │            (MySQL 兼容 DB + localStorage)
        └─────────┬───────┘
                  ▼
             AI 原始返回内容
                  │
                  ▼
                Parser
                  │
                  ▼
             Content DTO
                  │
      ┌───────────┼────────────┐
      ▼           ▼            ▼
    Editor     Preview     Exporter
                  │
                  ▼
          ┌── AdminJS ──┐
          │  (仅 admin)  │
          └──────────────┘
```

整个过程中：

- 页面层只负责交互与展示。
- Express API 层负责认证与路由分发。
- Workflow 负责流程调度。
- Parser 负责数据转换。
- DTO 负责数据传递。
- Exporter 负责导出。
- Storage / 数据库 负责持久化。
- AdminJS 负责数据库可视化管理。

所有模块均采用单向依赖，禁止跨层调用。

***

## 2.1 系统分层

整个系统划分为六层。

### 页面层（Presentation Layer）

负责：

- 页面展示
- 用户输入
- 状态绑定
- 用户交互

页面层不得：

- 调用 AI
- 拼接 Prompt
- 解析 AI 返回内容
- 操作浏览器存储

页面层只负责展示数据，不承担业务逻辑。

***

### Express API 层（API Layer）

Express 后端是整个系统唯一的外部接口层。

负责：

- JWT 认证与授权
- API 路由分发
- 请求参数校验
- 响应格式化
- CORS / Rate Limit / Helmet 安全中间件
- AdminJS 数据库管理面板挂载

不得：

- 包含业务逻辑
- 直接写 SQL（必须通过 Repository）
- 调用 AI Provider
- 拼接 Prompt

***

### Workflow 层

Workflow Engine 是整个系统唯一业务入口。

Workflow 负责：

- 校验参数
- 构建 Prompt
- 调用 AI
- 调用 Parser
- 返回 DTO
- 统一异常处理

Workflow 不负责：

- 保存数据
- 修改 DTO
- 导出内容
- 页面展示

***

### 服务层（Service Layer）

服务层包含：

- Prompt Builder
- AI Provider
- Parser

服务层只负责完成自身业务能力，不依赖页面层，可独立进行测试。

***

### 领域层（Domain Layer）

领域层负责维护整个系统的数据模型。

包括：

- Content DTO
- Prompt
- Prompt Version
- Generation Record
- Metadata

所有业务逻辑均围绕领域模型展开。

***

### 基础设施层（Infrastructure Layer）

基础设施层提供系统运行所需的基础能力。

包括：

- Storage（MySQL 兼容数据库 + localStorage 双模）
- Exporter
- AdminJS Panel（数据库管理）
- Logger
- Config（.env + config.json + user_settings 三层）

基础设施层不得包含任何业务逻辑。

***

# 3. 架构设计原则

整个项目必须遵循以下架构原则。

***

## 原则一：Workflow First

Workflow 是唯一业务入口。

所有业务流程必须经过 Workflow 调度。

任何页面不得直接调用：

- AI Provider
- Parser
- Storage
- Exporter

新增功能应优先扩展 Workflow，而不是修改页面逻辑。

***

## 原则二：Content DTO First

AI 返回的数据仅属于临时数据。

Content DTO 才是系统唯一业务数据。

Parser 负责将 AI 原始数据转换为 DTO。

Editor 修改 DTO。

Exporter 导出 DTO。

Storage 保存 DTO。

系统任何地方不得直接保存 AI 原始返回内容。

***

## 原则三：Prompt Version First

每次生成内容必须记录：

- Prompt ID
- Prompt Version
- AI 模型
- 创建时间

Prompt Version 一经创建，不允许修改。

历史 Prompt 不允许覆盖。

必须保证生成环境可追溯、可复现。

***

## 原则四：单一职责原则

每个模块只能承担一种职责。

例如：

- Prompt Builder 只负责构建 Prompt。
- Parser 只负责解析数据。
- Exporter 只负责导出内容。
- Storage 只负责数据存储。
- Workflow 只负责业务调度。

任何模块不得承担多个职责。

***

## 原则五：单向依赖

系统依赖关系如下：

```text
页面层
   │
   ▼
Workflow
   │
   ▼
服务层
   │
   ▼
领域层
   │
   ▼
基础设施层
```

禁止反向依赖。

禁止循环依赖。

禁止跨层调用。

***

# 4. 项目目录设计

推荐目录结构如下：

```text
src
├── app                    # 应用入口
├── assets                 # 静态资源
├── components             # 通用组件
├── layouts                # 页面布局
├── pages                  # 页面
├── router                 # 路由
├── stores                 # Pinia 状态管理
│
├── workflow               # Workflow Engine
│   ├── engine
│   ├── pipeline
│   ├── context
│   └── nodes
│
├── prompt                 # Prompt 模块
│   ├── builder
│   ├── template
│   ├── version
│   └── repository
│
├── parser                 # Parser 模块
│   ├── validator
│   ├── normalizer
│   ├── builder
│   └── mapper
│
├── providers              # AI Provider
├── exporter               # 导出模块
├── repositories           # 数据仓库
├── models                 # 数据模型
├── services               # 业务服务
├── types                  # 类型定义
├── utils                  # 工具函数
└── constants              # 常量
```

## 4.1 目录设计规范

项目目录按照职责划分，而不是按照页面划分。

各目录职责如下：

- `pages`：仅存放页面，不允许编写业务逻辑。
- `components`：存放可复用组件，不依赖具体业务。
- `workflow`：整个系统唯一流程调度中心。
- `prompt`：负责 Prompt 构建、模板管理、版本管理。
- `parser`：负责数据校验、解析、标准化及 DTO 构建。
- `providers`：负责 AI 模型调用，不包含业务逻辑。
- `exporter`：负责 Markdown、JSON 等导出能力。
- `repositories`：统一数据存取接口，不允许直接操作 LocalStorage。
- `models`：存放领域模型和 DTO，不包含业务代码。
- `services`：封装通用业务服务。
- `utils`：存放纯工具函数，不依赖业务模块。

任何模块都应放置在其职责对应的目录中，禁止出现职责混乱或跨模块存放代码的情况。

# 5. 核心模块设计

整个系统由六个核心模块组成，各模块职责独立，通过统一接口进行协作。

```text
                Workflow Engine
                       │
     ┌─────────────────┼─────────────────┐
     ▼                 ▼                 ▼
Prompt Builder     AI Provider       Storage
     │                 │
     └──────────┬──────┘
                ▼
          Raw Response
                ▼
             Parser
                ▼
          Content DTO
                │
      ┌─────────┼─────────┐
      ▼         ▼         ▼
    Editor   Preview   Exporter
```

模块之间仅允许通过公开接口通信。

禁止模块直接访问其他模块内部实现。

***

## 5.1 Workflow Engine

Workflow Engine 是整个系统唯一的业务入口，也是所有模块的调度中心。

所有页面请求必须经过 Workflow Engine。

Workflow Engine 负责：

- 接收页面请求。
- 校验输入参数。
- 获取 Prompt Template。
- 获取 Prompt Version。
- 调用 Prompt Builder。
- 调用 AI Provider。
- 调用 Parser。
- 返回统一 Content DTO。
- 记录 Generation Record。
- 统一处理异常。

Workflow Engine 不负责：

- 页面渲染。
- Prompt 编辑。
- AI 数据解析。
- DTO 修改。
- 数据导出。

Workflow Engine 应保持无状态（Stateless），不保存任何业务数据。

***

## 5.2 Prompt Builder

Prompt Builder 是系统唯一允许生成 Prompt 的模块。

任何模块不得自行拼接 Prompt。

Prompt Builder 的输入包括：

- Prompt Template
- Runtime Variables
- Prompt Version
- Platform
- Metadata

输出：

Final Prompt

整体流程如下：

```text
Prompt Template
        │
        ▼
Runtime Variables
        │
        ▼
Metadata
        │
        ▼
Prompt Version
        │
        ▼
Final Prompt
```

Prompt Builder 应保证：

- Prompt 格式统一。
- 自动替换变量。
- 自动注入 Metadata。
- 自动记录 Prompt Version。
- 保证 Prompt 可复现。

***

## 5.3 AI Provider

AI Provider 是模型调用抽象层。

Workflow 不直接调用具体 AI，而是调用统一 Provider 接口。

建议统一接口：

```ts
interface AIProvider {
  generate(prompt: string): Promise<string>;
}
```

未来可扩展：

- OpenAI
- Claude
- Gemini
- DeepSeek
- Qwen
- GLM

新增模型时，仅新增 Provider 实现，不修改 Workflow。

***

## 5.4 Parser

Parser 是整个系统唯一的数据转换入口。

AI 返回的数据不能直接进入系统。

所有 Raw Response 必须经过 Parser。

Parser 负责：

- JSON 校验。
- 数据解析。
- 数据标准化。
- 默认值填充。
- DTO 构建。

Parser 输出必须始终为统一 Content DTO。

任何模块不得直接解析 AI 返回的数据。

***

## 5.5 Storage

Storage 负责数据持久化。

Storage 不允许暴露具体存储实现。

业务层只能调用 Repository Interface。

MVP 阶段：

LocalStorage

后续：

IndexedDB

Cloud Storage

Storage 不负责：

- 数据解析。
- 数据校验。
- 数据转换。

Storage 仅负责数据读写。

***

## 5.6 Exporter

Exporter 是系统统一导出模块。

所有导出能力必须读取 Content DTO。

不得读取页面数据。

不得读取 Raw Response。

Exporter 应采用插件式设计。

例如：

Markdown Exporter

↓

JSON Exporter

↓

HTML Exporter

↓

PDF Exporter

↓

Image Exporter

新增导出格式时，仅新增模块，不修改 Workflow。

***

# 6. Workflow Specification

Workflow 是整个系统唯一业务入口。

任何业务必须经过 Workflow。

完整流程如下：

```text
用户输入
    │
    ▼
参数校验
    │
    ▼
读取 Prompt Template
    │
    ▼
读取 Prompt Version
    │
    ▼
Prompt Builder
    │
    ▼
生成 Final Prompt
    │
    ▼
AI Provider
    │
    ▼
Raw Response
    │
    ▼
Parser
    │
    ▼
Content DTO
    │
    ├───────────────┐
    ▼               ▼
 Editor         Exporter
```

整个流程中，每个阶段仅完成自身职责。

任何节点不得跨越流程调用其他模块。

***

## 6.1 Workflow 生命周期

一次完整生成过程包含以下阶段：

### Stage 1：Input

接收用户输入。

包括：

- Topic
- Platform
- Extra Requirement

Workflow 首先验证输入是否合法。

***

### Stage 2：Build Prompt

Workflow 调用 Prompt Builder。

Builder 根据：

- Template
- Variables
- Prompt Version

生成最终 Prompt。

Workflow 不参与 Prompt 拼接。

***

### Stage 3：Generate

Workflow 调用 AI Provider。

Provider 返回 Raw Response。

Workflow 不解析返回数据。

***

### Stage 4：Parse

Workflow 将 Raw Response 交给 Parser。

Parser 完成：

- JSON 校验
- 数据标准化
- DTO 构建

Workflow 仅接收最终 DTO。

***

### Stage 5：Output

Workflow 返回 Content DTO。

页面开始渲染。

Editor、Preview、Exporter 全部使用同一份 DTO。

***

## 6.2 Workflow 设计原则

Workflow 必须遵循以下约束：

- Workflow 是唯一业务入口。
- Workflow 不保存状态。
- Workflow 不解析 AI 数据。
- Workflow 不修改 DTO。
- Workflow 不导出数据。
- Workflow 不直接操作 Storage。

Workflow 仅负责协调模块之间的调用关系。

***

# 7. Prompt Specification

Prompt 是整个系统的核心资产。

Prompt 不只是一个字符串，而是一套完整的生命周期管理体系。

Prompt 由四部分组成：

```text
System Prompt
        │
        ▼
Template Prompt
        │
        ▼
Runtime Variables
        │
        ▼
Prompt Version
        │
        ▼
Final Prompt
```

***

## 7.1 Prompt Template

Template 定义固定规则。

包括：

- AI 角色
- 输出格式
- 写作要求
- 平台规则
- 禁止事项

Template 不包含运行时变量。

***

## 7.2 Runtime Variables

运行时变量由 Workflow 提供。

包括：

- Topic
- Platform
- Audience
- Language
- Extra Requirement

Builder 负责变量替换。

页面不得直接替换变量。

***

## 7.3 Prompt Version

每一次修改 Prompt，必须创建新的 Prompt Version。

禁止覆盖历史版本。

Generation Record 必须记录：

- Prompt ID
- Prompt Version
- AI Model
- Timestamp

通过 Prompt Version，系统应能够完整复现一次内容生成环境。

Prompt Version 是整个项目的重要基础能力，不允许省略或绕过。

# 8. Parser Specification

Parser 是整个系统唯一的数据解析与转换模块。

AI 返回的数据属于临时数据（Raw Response），不得直接进入业务系统。

任何需要使用 AI 返回内容的模块，都必须先经过 Parser 转换为统一的 Content DTO。

整体解析流程如下：

```text
                Raw Response
                      │
                      ▼
            Syntax Validation
                      │
                      ▼
           Structure Validation
                      │
                      ▼
             Field Validation
                      │
                      ▼
               Data Normalize
                      │
                      ▼
             Content DTO Builder
                      │
                      ▼
                Content DTO
```

***

## 8.1 Parser 生命周期

Parser 的执行过程固定为六个阶段。

### Stage 1：Syntax Validation（语法校验）

验证 AI 返回内容是否满足基本格式要求。

检查内容包括：

- 返回内容不能为空。
- 必须符合 JSON 格式。
- 不允许存在非法字符。
- 不允许存在无法解析的数据。

若语法校验失败，应立即终止解析流程，并返回统一错误对象。

***

### Stage 2：Structure Validation（结构校验）

验证数据结构是否符合系统规范。

至少应包含以下字段：

- titles
- cover
- pages
- tags

允许存在扩展字段，但不得缺少核心字段。

若结构不符合规范，应返回解析异常。

***

### Stage 3：Field Validation（字段校验）

验证每个字段的数据类型。

例如：

| 字段       | 类型     |
| :------- | :----- |
| titles   | Array  |
| cover    | Object |
| pages    | Array  |
| tags     | Array  |
| summary  | String |
| metadata | Object |

若字段类型错误，Parser 不得自动推断类型，应返回校验失败。

***

### Stage 4：Normalize（数据标准化）

Parser 应统一处理数据格式。

例如：

- 去除字符串首尾空格。
- 删除空标题。
- 删除空标签。
- 标签自动去重。
- 自动补全缺失字段。
- 分页重新排序。
- 补充默认值。

经过 Normalize 后，所有数据必须满足统一规范。

***

### Stage 5：DTO Builder

Parser 根据标准化后的数据构建 Content DTO。

此阶段禁止返回普通 JSON。

所有业务模块只能接收 Content DTO。

***

### Stage 6：Result

Workflow 接收 Content DTO。

页面、编辑器、导出模块均使用同一份 DTO。

Raw Response 生命周期在此结束。

***

## 8.2 Parser 约束

Parser 必须遵循以下规范：

允许：

- 校验数据。
- 补全默认值。
- 删除非法数据。
- 构建 DTO。

禁止：

- 调用 AI。
- 保存数据。
- 修改 Prompt。
- 修改 Workflow。
- 更新页面状态。

Parser 只负责数据转换。

***

# 9. Content DTO Specification

Content DTO 是整个项目唯一的数据模型。

所有业务模块必须围绕 Content DTO 工作。

系统中不得维护多个内容结构。

整体结构如下：

```text
Content
├── id
├── topic
├── platform
├── titles[]
├── cover
├── pages[]
├── tags[]
├── summary
└── metadata
        ├── promptId
        ├── promptVersion
        ├── model
        ├── platform
        ├── createdAt
        └── generator
```

***

## 9.1 DTO 定义

建议统一接口如下：

```ts
interface Content {
  id: string;
  topic: string;
  platform: string;

  titles: Title[];

  cover: Cover;

  pages: Page[];

  tags: string[];

  summary: string;

  metadata: Metadata;
}
```

整个项目只允许维护这一套 Content 数据结构。

***

## 9.2 Title

```ts
interface Title {
  id: string;
  text: string;
}
```

支持多个标题。

用于：

- AI 多标题生成。
- 用户切换标题。
- 导出不同标题版本。

***

## 9.3 Cover

```ts
interface Cover {
  title: string;
  subtitle: string;
}
```

当前用于封面文案。

未来可直接用于：

- AI 图片生成。
- 封面设计。
- 社交媒体分享图。

***

## 9.4 Page

```ts
interface Page {
  id: string;
  title: string;
  content: string;
}
```

正文统一采用分页结构。

禁止使用一个超长字符串存储全文。

分页设计便于：

- 图片生成。
- Markdown 导出。
- 自动排版。
- 多平台适配。

***

## 9.5 Metadata

Metadata 用于记录生成环境。

```ts
interface Metadata {
  promptId: string;
  promptVersion: string;
  model: string;
  platform: string;
  createdAt: string;
  generator: string;
}
```

Metadata 不属于正文内容。

默认不允许用户编辑。

导出 JSON 时必须保留。

***

## 9.6 DTO 生命周期

```text
AI Response
      │
      ▼
Parser
      │
      ▼
Content DTO
      │
 ┌────┼──────────────┐
 ▼    ▼              ▼
Editor Exporter   Storage
```

DTO 自 Parser 创建开始，贯穿整个业务生命周期。

任何模块不得重新构建新的 DTO。

***

## 9.7 DTO 设计原则

整个项目遵循以下原则：

- DTO 是唯一业务数据。
- DTO 可以编辑。
- DTO 可以导出。
- DTO 可以保存。
- DTO 可以同步。

禁止：

- 保存 Raw Response。
- 修改 DTO 结构。
- 页面维护自己的 Content 对象。

所有业务统一围绕 DTO 展开。

***

# 10. Storage Specification

Storage 用于持久化系统数据。

采用 Repository 模式，对外暴露统一接口。

业务层不得直接访问浏览器存储。

整体架构如下：

```text
Workflow
     │
     ▼
Repository Interface
     │
 ┌───┴─────────────┐
 ▼                 ▼
LocalStorage   IndexedDB
                    │
                    ▼
              Cloud Storage
```

***

## 10.1 Repository Interface

建议统一接口如下：

```ts
interface ContentRepository {

  saveContent(content: Content): Promise<void>;

  getContent(id: string): Promise<Content | null>;

  deleteContent(id: string): Promise<void>;

  listContents(): Promise<Content[]>;

}
```

Prompt Repository：

```ts
interface PromptRepository {

  savePrompt();

  getPrompt();

  getVersion();

}
```

Generation Repository：

```ts
interface GenerationRepository {

  saveGeneration();

  getGeneration();

}
```

Workflow 只调用 Repository Interface。

不得依赖具体存储实现。

***

## 10.2 存储策略

MVP 阶段采用 LocalStorage。

存储内容包括：

- Prompt
- Prompt Version
- Generation Record
- Content DTO
- 用户配置

后续升级至 IndexedDB 或云端时，不需要修改 Workflow 与业务逻辑，仅替换 Repository 实现即可。

***

## 10.3 Storage 设计原则

Storage 仅负责数据持久化。

允许：

- 保存。
- 查询。
- 删除。
- 更新。

禁止：

- 数据解析。
- 数据校验。
- DTO 修改。
- 页面状态管理。

Storage 应保持无业务逻辑，所有数据操作均通过 Repository Interface 完成，保证存储实现可自由替换，提高系统扩展性和可维护性。

# 11. Export Specification

Export Module 是系统统一导出模块。

所有导出能力均基于 Content DTO 实现。

Exporter 不允许直接读取页面数据，也不允许读取 AI 原始返回内容。

整体架构如下：

```text
                Content DTO
                     │
                     ▼
            Exporter Interface
                     │
     ┌───────────────┼────────────────┐
     ▼               ▼                ▼
 Markdown       JSON Export      HTML Export
                                     │
                                     ▼
                              PDF / DOCX
                              （未来扩展）
```

Exporter 采用插件式架构。

新增导出格式时，仅新增对应 Exporter，不允许修改 Workflow、Parser 或 Editor。

***

## 11.1 Exporter Interface

所有导出器必须实现统一接口。

建议定义如下：

```ts
interface Exporter<T> {

  export(content: Content): T;

}
```

统一接口的目的：

- 保持导出行为一致。
- 降低新增导出格式成本。
- 保证业务层无需关心具体导出实现。

***

## 11.2 Markdown Export

Markdown 为 MVP 默认导出格式。

建议输出结构如下：

```text
# 标题

## 摘要

正文第一页

---

正文第二页

---

正文第三页

## 标签

#AI

#ContentFlow
```

Markdown Exporter 仅负责格式转换。

不得修改 DTO 内容。

***

## 11.3 JSON Export

JSON 为 DTO 原始结构导出。

主要用于：

- 数据备份
- 二次开发
- API 调试
- Workflow 导入
- 历史恢复

JSON 导出必须完整保留 Metadata。

不得删除 Prompt Version。

***

## 11.4 Export 设计原则

Exporter 必须遵循以下约束：

允许：

- 读取 DTO。
- 转换格式。
- 输出文件。

禁止：

- 修改 DTO。
- 调用 AI。
- 调用 Parser。
- 更新页面。
- 保存数据。

Exporter 应保持无状态（Stateless）。

***

# 12. 页面通信规范

整个系统采用单向数据流。

页面不得直接调用业务模块。

统一调用关系如下：

```text
Page
 │
 ▼
Store
 │
 ▼
Workflow
 │
 ▼
Parser
 │
 ▼
Content DTO
 │
 ├──────────────┐
 ▼              ▼
Editor      Exporter
```

页面只负责：

- 用户输入
- 用户交互
- 页面展示

所有业务逻辑均放置于 Workflow。

***

## 12.1 Store

Store 负责维护当前运行状态。

例如：

- 当前 Content
- 当前 Prompt
- 当前 Platform
- 当前编辑状态
- 当前加载状态

Store 不负责：

- AI 调用
- Parser
- Storage
- Export

Store 不允许维护业务逻辑。

***

## 12.2 页面职责

页面遵循"轻页面、重业务"原则。

页面仅允许：

- 绑定数据。
- 监听事件。
- 调用 Workflow。
- 更新 UI。

页面不得：

- 拼接 Prompt。
- 调用 AI。
- 解析 JSON。
- 修改 DTO 结构。
- 保存浏览器数据。

复杂逻辑必须放入独立模块。

***

# 13. Error Handling Specification

整个系统采用统一异常处理机制。

所有异常由 Workflow 统一捕获。

页面只负责展示错误信息。

异常分类建议如下：

| 错误类型             | 示例          |
| :--------------- | :---------- |
| Validation Error | 输入为空        |
| Prompt Error     | Prompt 构建失败 |
| Provider Error   | AI 请求失败     |
| Parse Error      | JSON 解析失败   |
| DTO Error        | DTO 校验失败    |
| Storage Error    | 数据保存失败      |
| Export Error     | 导出失败        |

***

## 13.1 错误对象

统一错误对象如下：

```ts
interface AppError {

  code: string;

  module: string;

  message: string;

  detail?: unknown;

}
```

所有模块均返回统一错误对象。

禁止直接返回字符串。

***

## 13.2 错误处理原则

所有异常必须：

- 统一记录。
- 统一返回。
- 统一展示。
- 保留错误上下文。

禁止：

- 页面自行捕获业务异常。
- 模块直接弹出提示。
- 返回不规范错误对象。

Workflow 是唯一异常处理入口。

***

# 14. 扩展性设计

虽然 MVP 仅实现基础能力，但整体架构必须提前预留扩展能力。

未来新增能力不应影响现有模块。

***

## 14.1 AI Provider 扩展

新增模型时：

仅新增 Provider。

不得修改：

- Workflow
- Parser
- DTO

支持示例：

- OpenAI
- Claude
- Gemini
- DeepSeek
- Qwen
- GLM

***

## 14.2 Prompt Template 扩展

新增平台时：

仅新增 Prompt Template。

无需修改：

- Parser
- Workflow
- Exporter

支持示例：

- 小红书
- 抖音
- 公众号
- 知乎
- B站
- 视频脚本

***

## 14.3 Image Generation

未来图片生成直接读取：

- Cover
- Pages
- Tags
- Summary

无需重新解析内容。

Content DTO 保持不变。

***

## 14.4 Workflow 扩展

Workflow 应支持新增节点。

例如：

```text
Generate

↓

Review

↓

Rewrite

↓

Image Generate

↓

Publish

↓

Archive
```

新增节点不得影响已有流程。

***

## 14.5 Storage 扩展

Repository Interface 保持不变。

未来可替换为：

- IndexedDB
- SQLite
- Supabase
- Firebase
- 自建服务

业务代码无需修改。

***

# 15. 开发规范

所有开发工作必须遵循以下规范。

***

## 15.1 模块规范

每个模块只负责一种职责。

模块之间只能通过 Interface 通信。

禁止：

- 循环依赖。
- 跨层访问。
- 模块直接调用页面。

***

## 15.2 DTO 规范

Content DTO 是唯一业务数据。

禁止：

- 重复定义 DTO。
- 页面维护独立数据结构。
- 使用 Raw Response 作为业务数据。

新增字段必须同步更新：

- Parser
- Exporter
- Repository
- Type Definition

***

## 15.3 Prompt 规范

所有 Prompt 必须经过 Prompt Builder。

必须记录：

- Prompt ID
- Prompt Version

禁止：

- 页面拼接 Prompt。
- 覆盖历史 Prompt。
- 修改运行中的 Prompt。

***

## 15.4 Workflow 规范

Workflow 是唯一业务入口。

任何业务不得绕过 Workflow。

新增功能优先扩展 Workflow，而不是修改页面。

***

## 15.5 Parser 规范

Parser 是唯一数据转换入口。

禁止：

- 页面解析 AI 数据。
- Exporter 修改 DTO。
- Storage 修改 DTO。

Parser 输出必须始终为 Content DTO。

***

## 15.6 Repository 规范

业务层禁止直接操作：

- LocalStorage
- IndexedDB
- SessionStorage

所有数据操作必须经过 Repository。

***

## 15.7 Export 规范

所有 Exporter 必须实现统一接口。

新增导出格式时：

新增模块。

禁止修改已有 Exporter。


# 16. 总结

ContentFlow Lite 的整体架构围绕三个核心理念展开。

## Workflow First

Workflow Engine 是系统唯一业务入口。

所有内容生成、编辑、导出及历史记录均通过 Workflow 调度，保证业务流程统一、可维护、可扩展。

***

## Content DTO First

Content DTO 是整个系统唯一的数据模型。

所有模块围绕 DTO 工作，不直接依赖 AI 原始输出。

统一的数据模型不仅降低了模块耦合，也为 Markdown、JSON、图片生成及未来更多导出能力提供了稳定的数据基础。

***

## Prompt Version First

Prompt Version 是 Prompt 生命周期的重要组成部分。

每次生成内容时，系统必须记录 Prompt Version、AI 模型及生成环境。

通过 Prompt Version，可以实现生成过程追踪、效果对比及结果复现，为 Prompt 持续优化提供可靠的数据支撑。

***

本规范定义了 ContentFlow Lite 的整体架构、模块职责、数据模型、接口约束及开发规范。

所有开发工作均应遵循本规范，确保系统具备统一的数据结构、清晰的模块边界、稳定的业务流程以及良好的扩展能力，为后续接入更多 AI 模型、更多平台模板、图片生成、自动发布及插件系统奠定坚实基础。

````

# 附录 A：Content DTO 示例

以下示例展示了系统统一 Content DTO 的完整数据结构。

```json
{
  "id": "content_001",
  "topic": "去武功山旅游",
  "platform": "xiaohongshu",
  "titles": [
    {
      "id": "title_001",
      "text": "武功山两天一夜超详细攻略"
    },
    {
      "id": "title_002",
      "text": "第一次去武功山，这篇攻略一定要收藏"
    }
  ],
  "cover": {
    "title": "武功山旅游攻略",
    "subtitle": "两天一夜轻松出发"
  },
  "pages": [
    {
      "id": "page_001",
      "title": "出发准备",
      "content": "建议提前查看天气，准备防晒用品、雨衣及舒适的登山鞋。"
    },
    {
      "id": "page_002",
      "title": "行程安排",
      "content": "第一天抵达景区并登山，第二天观看日出后返程。"
    }
  ],
  "tags": [
    "武功山",
    "江西旅游",
    "旅行攻略"
  ],
  "summary": "适合第一次前往武功山的两天一夜旅行攻略。",
  "metadata": {
    "promptId": "travel_strategy",
    "promptVersion": "v1.0.0",
    "model": "GPT-5.5",
    "platform": "xiaohongshu",
    "createdAt": "2026-07-03T10:00:00Z",
    "generator": "ContentFlow Lite"
  }
}
```

该示例用于说明系统统一的数据格式。

所有模块均应围绕该数据结构进行开发。

不得维护其他内容对象。

````

# 附录 B：Prompt 示例

Prompt 由 Template、运行时变量及 Prompt Version 共同组成。

示例：

```text
你是一位资深的小红书内容创作者。

请围绕以下主题创作内容。

主题：
{{topic}}

目标平台：
{{platform}}

要求：

1. 输出 5 个标题。
2. 输出封面文案。
3. 按分页输出正文。
4. 输出标签。
5. 返回标准 JSON。
6. 严格遵循 Content DTO 数据结构。
```

Prompt Builder 负责将运行时变量替换为实际内容，并自动记录 Prompt Version。

页面不得自行拼接 Prompt。

***

# 附录 C：Workflow 示例

以下示例展示了一次完整内容生成的生命周期。

```text
用户输入主题
      │
      ▼
Workflow Engine
      │
      ▼
Prompt Builder
      │
      ▼
AI Provider
      │
      ▼
Raw Response
      │
      ▼
Parser
      │
      ▼
Content DTO
      │
      ├──────────────┐
      ▼              ▼
   Editor        Exporter
      │
      ▼
 Repository
```

整个流程中：

- Workflow 负责业务调度。
- Parser 负责数据转换。
- DTO 负责数据流转。
- Exporter 负责导出。
- Repository 负责持久化。

任何模块不得绕过 Workflow。

***

# 附录 D：架构设计决策（Architecture Decision Record）

为了保证系统具备良好的可维护性和扩展能力，项目采用以下核心设计决策。

**为什么使用 Content DTO？**

统一数据结构，避免多个模块维护不同的数据格式，降低模块之间的耦合度。

**为什么记录 Prompt Version？**

保证每一次内容生成都可追溯、可复现，便于 Prompt 持续优化及效果对比。

**为什么采用 Workflow Engine？**

统一所有业务入口，避免页面直接调用各业务模块，保证流程一致性。

**为什么采用 Repository 模式？**

隔离业务逻辑与存储实现，方便未来从 LocalStorage 平滑迁移至 IndexedDB 或云端存储。

**为什么采用插件式 Exporter？**

降低新增导出格式的开发成本，实现 Markdown、JSON、HTML、PDF 等导出能力的持续扩展，而无需修改核心业务代码。

以上设计决策属于系统长期约束，新功能开发应优先遵循本规范，而不是修改既有架构。
