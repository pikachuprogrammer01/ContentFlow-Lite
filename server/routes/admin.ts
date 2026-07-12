/**
 * server/routes/admin.ts — 管理路由聚合入口（重导出）
 *
 * 实际实现拆分在 server/routes/admin/ 目录下。
 * 此文件保持向后兼容，避免修改 app.ts 中的 import。
 */

export { createAdminRouter } from './admin/index.js';
