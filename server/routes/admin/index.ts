/**
 * server/routes/admin/index.ts — 管理路由聚合入口
 *
 * 所有 /api/admin/* 子路由在此注册。
 * app.ts 只需 `app.use('/api/admin', createAdminRouter())`。
 */

import { Router } from 'express';
import { authMiddleware, adminGuard } from '../../middleware/auth.js';
import { mountUsers } from './users.js';
import { mountContents } from './contents.js';
import { mountGenerations } from './generations.js';
import { mountPrompts } from './prompts.js';

export function createAdminRouter(): Router {
  const router = Router();
  router.use(authMiddleware);
  router.use(adminGuard);

  mountUsers(router);
  mountContents(router);
  mountGenerations(router);
  mountPrompts(router);

  return router;
}
