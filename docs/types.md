# ContentFlow Lite — 核心类型定义

本文件定义 ContentFlow Lite 中所有跨模块共享的核心 TypeScript 类型。
CLAUDE.md 在数据结构类任务中引用本文件。

---

## 一、FinalPrompt（Prompt 最终产物）

Prompt Builder 的输出，传给 AI Provider。

```ts
interface FinalPrompt {
  /** 系统提示词（角色设定 + 输出格式约束 + OutputSchema） */
  systemPrompt: string;
  /** 用户提示词（主题 + 平台 + 补充要求） */
  userPrompt: string;
}
```

---

## 二、Content DTO（统一内容模型）

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
  /** 用户输入的补充要求，重试时复用 */
  extraRequirements?: string;
  metadata: Metadata;
}

interface Title {
  id: string;
  text: string;
}

interface Cover {
  title: string;
  subtitle: string;
}

interface Page {
  id: string;
  title: string;
  content: string;
  /** 该页对应的图片生成 Prompt（用户可选填） */
  imagePrompt?: string;
  /** 生成后的图片地址 */
  imageUrl?: string;
  /** 图片生成状态 */
  imageStatus?: 'idle' | 'generating' | 'done' | 'failed';
}

interface Metadata {
  promptId: string;
  promptVersion: string;
  model: string;
  platform: string;
  createdAt: string;
  generator: string;
}
```

---

## 三、Prompt 相关类型

### 3.1 PromptTemplate

```ts
interface PromptTemplate {
  id: string;
  userId: string;
  type: 'text' | 'image';
  isDefault: boolean;
  platform: string;
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  outputSchema?: OutputSchema;
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 PromptVersion

```ts
interface PromptVersion {
  id: string;
  templateId: string;
  version: string;          // V1, V2, V3, ...
  systemPrompt: string;
  userPromptTemplate: string;
  outputSchemaSnapshot?: OutputSchema;
  createdAt: string;
}
```

### 3.3 OutputSchema

每个 PromptTemplate 必须附加的 JSON 结构校验定义。

```ts
interface OutputSchema {
  fields: OutputSchemaField[];
}

interface OutputSchemaField {
  name: string;
  type: 'string' | 'number' | 'array' | 'object';
  required: boolean;
  children?: OutputSchemaField[];
}
```

---

## 四、Provider 接口

### 4.1 AIProvider（文字生成）

```ts
interface AIProvider {
  readonly name: string;
  readonly model: string;
  generate(prompt: FinalPrompt): Promise<string>;
}
```

### 4.2 ImageProvider（图片生成）

```ts
interface ImageProvider {
  readonly name: string;
  readonly model: string;
  generate(prompt: string, options?: ImageOptions): Promise<ImageResult>;
}

interface ImageOptions {
  size?: string;     // 图片尺寸（如 '1024x1024'）
  n?: number;        // 生图数量（默认 1）
}

interface ImageResult {
  url: string;
  revisedPrompt?: string;
}
```

---

## 五、Workflow 相关类型

### 5.1 WorkflowNodeType

```ts
type WorkflowNodeType =
  | 'input'       // Input Node — 参数校验
  | 'prompt'      // Prompt Node — 读取模板 + Builder
  | 'provider'    // Provider Node — 调用 AI
  | 'parse'       // Parse Node — 解析 AI 输出
  | 'validate'    // Validate Node — OutputSchema 校验 + 重试
  | 'dto'         // DTO Node — 组装 Content DTO
  | 'output';     // Output Node — 返回结果
```

### 5.2 WorkflowContext

```ts
interface WorkflowContext {
  input: WorkflowInput;
  prompt?: FinalPrompt;
  rawResponse?: string;
  parsedData?: Record<string, unknown>;
  content?: Content;
  error?: WorkflowError;
  nodeResults: Map<WorkflowNodeType, unknown>;
}

interface WorkflowInput {
  topic: string;
  platform: string;
  promptId?: string;
  promptVersion?: string;
  extraRequirements?: string;
}
```

### 5.3 WorkflowError

```ts
interface WorkflowError {
  code: string;
  node: WorkflowNodeType;
  message: string;
  retryable: boolean;
  detail?: unknown;
}
```

---

## 六、Repository 接口

### 6.1 前端 Repository

```ts
interface Repository<T extends { id: string }> {
  getById(id: string): Promise<T | null>;
  list(filter?: Record<string, unknown>): Promise<T[]>;
  create(item: Omit<T, 'id'>): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
```

### 6.2 后端 Domain Repository

```ts
interface DomainRepository<T> {
  findById(id: string | number): Promise<T | null>;
  findAll(filter?: Record<string, unknown>): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: string | number, entity: Partial<T>): Promise<T>;
  delete(id: string | number): Promise<void>;
}
```

---

## 七、AppError（统一错误对象）

```ts
interface AppError {
  code: string;        // 错误码（如 'PROVIDER_TIMEOUT'）
  module: string;      // 来源模块
  message: string;     // 用户可读错误描述
  detail?: unknown;    // 调试信息（不暴露给前端）
}
```

---

## 八、认证相关

```ts
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface UserInfo {
  id: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
}
```

---

## 九、平台类型

```ts
type Platform =
  | 'xiaohongshu'    // 小红书
  | 'wechat'         // 公众号
  | 'zhihu'          // 知乎
  | 'douyin'         // 抖音
  | 'bilibili'       // B站
  | 'toutiao';       // 头条

type TextModel = 'gemini-2.0-flash' | 'deepseek-v4-flash' | 'qwen2.5-72b-instruct';

type ImageModel = 'wanxiang-v2';

type ImageRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
```

---

## 十、交叉引用

| 类型 | 定义位置 | 主要使用方 |
|------|---------|-----------|
| Content | §二 | Workflow, Parser, Repository, Exporter, Editor |
| FinalPrompt | §一 | PromptBuilder → AIProvider |
| OutputSchema | §3.3 | PromptTemplate, Validate Node |
| AIProvider | §4.1 | Provider Node |
| ImageProvider | §4.2 | Provider Node (图片分支) |
| WorkflowNodeType | §5.1 | Workflow Engine |
| Repository | §6 | 前端 HttpRepository, 后端 DomainRepository |
| AppError | §七 | Error Boundary, Logger |
| AuthTokens | §八 | Auth Store, API Client |
