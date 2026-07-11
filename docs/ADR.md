# 架构决策记录（ADR）

> 来源：`docs/SPEC.md` §附录 D
> 记录 ContentFlow Lite 开发过程中的关键架构决策及其理由

## 核心设计决策

为了保证系统具备良好的可维护性和扩展能力，项目采用以下核心设计决策。

**为什么使用 Content DTO？**

统一数据结构，避免多个模块维护不同的数据格式，降低模块之间的耦合度。

**为什么记录 Prompt Version？**

保证每一次内容生成都可追溯、可复现，便于 Prompt 持续优化及效果对比。

**为什么采用 Workflow Engine？**

统一所有业务入口，避免页面直接调用各业务模块，保证流程一致性。

**为什么采用 Repository 模式？**

隔离业务逻辑与存储实现，前端通过 HttpRepository 调后端 API，后端 Repository 封装数据库操作。方便未来替换数据库实现而不影响业务代码。

**为什么采用插件式 Exporter？**

降低新增导出格式的开发成本，实现 Markdown、JSON、HTML、PDF 等导出能力的持续扩展，而无需修改核心业务代码。

# 14. 部署方案

| 组件 | 平台 | 说明 |
|------|------|------|
| 前端 | **GitHub Pages** | 静态 SPA，`vite build` 后部署。路由使用 hash 模式 |
| 后端 | **Vercel** | Express API，Node.js 运行时。通过 `vercel.json` 配置 |
| 数据库 | 用户自备 | MySQL 兼容（本地/TiDB/MariaDB/RDS），通过 `.env` 的 `DB_*` 变量配置连接 |

不做 Docker 封装，不做移动端适配，不做国际化。

# 15. API 文档方案

使用 **swagger-jsdoc + @scalar/express-api-reference**：

- 路由上写 JSDoc 注释（`@swagger`），自动生成 OpenAPI spec
- `@scalar/express-api-reference` 渲染现代 API 文档页（挂载 `/api-docs`）
- 不单独维护手写 API 文档文件
- 注释中的 summaries/descriptions 使用中文

以上设计决策属于系统长期约束，新功能开发应优先遵循本规范，而不是修改既有架构。
