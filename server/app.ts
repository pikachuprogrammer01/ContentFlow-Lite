/**
 * server/app.ts — Express 应用配置
 *
 * 负责中间件加载、路由挂载。
 * 业务逻辑在 routes/ 中，本文件仅做装配。
 */

import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { testConnection } from './db/client.js';
import { createAuthRouter } from './routes/auth.js';
import { createGenerateRouter } from './routes/generate.js';
import { createContentRouter } from './routes/content.js';
import { createPromptRouter } from './routes/prompt.js';
import { createAdminRouter } from './routes/admin.js';

// 自动注册所有 Provider（side-effect import）
import './providers/mock-provider.js';
import './providers/gemini-provider.js';
import './providers/deepseek-provider.js';

/**
 * 创建并配置 Express 应用实例。
 * 将中间件和路由挂载到 app 上。
 */
export function createApp(): Express {
  const app = express();

  // ── 安全中间件 ────────────────────────────────────────
  // Helmet: 设置安全 HTTP 头，CSP 防 XSS
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'script-src': ["'self'"],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
        },
      },
    }),
  );

  // CORS: 允许前端跨域请求
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // JSON 请求体解析
  app.use(express.json({ limit: '1mb' }));

  // ── 健康检查端点 ──────────────────────────────────────
  // Phase 0 出口标准：GET /health → { status: 'ok', db: 'connected' }
  app.get('/health', async (_req, res) => {
    const dbOk = await testConnection();
    res.json({
      status: dbOk ? 'ok' : 'degraded',
      db: dbOk ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  });

  // ── API 路由挂载 ──────────────────────────────────────
  app.use('/api/auth', createAuthRouter());
  app.use('/api/generate', createGenerateRouter());
  app.use('/api/content', createContentRouter());
  app.use('/api/prompt', createPromptRouter());
  app.use('/api/admin', createAdminRouter());

  return app;
}
