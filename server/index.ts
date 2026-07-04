/**
 * server/index.ts — 应用入口
 *
 * 启动流程：
 *   1. 加载配置（.env）
 *   2. 初始化数据库连接池
 *   3. 创建 Express 应用
 *   4. 监听端口
 *   5. 注册优雅关闭
 */

// ⚠️  必须在所有其他 import 之前加载 env，确保 process.env 就绪
import './env.js';

import { createApp } from './app.js';
import { initPool, closePool } from './db/client.js';
import { initTables } from './db/schema.js';
import { createLogger } from './utils/logger.js';

const log = createLogger('server');

const PORT = Number(process.env.PORT) || 3001;

async function main(): Promise<void> {
  // 1. 初始化数据库连接池
  log.info('正在连接数据库...');
  initPool();
  log.info('数据库连接池已初始化');

  // 2. 初始化数据库表（IF NOT EXISTS，可安全重复执行）
  try {
    const pool = (await import('./db/client.js')).getPool();
    const tables = await initTables(pool);
    log.info(`数据库表已就绪 (${tables.length} 张): ${tables.join(', ')}`);
  } catch (err) {
    log.warn('数据库表初始化跳过（可能已存在）', { error: String(err) });
  }

  // 3. 创建 Express 应用
  const app = createApp();

  // 4. 启动监听
  const server = app.listen(PORT, () => {
    log.info(`🚀 ContentFlow Lite API 服务已启动`, { port: PORT });
    log.info(`📍 健康检查: http://localhost:${PORT}/health`);
  });

  // 4. 优雅关闭
  const shutdown = async (signal: string) => {
    log.info(`收到 ${signal} 信号，正在优雅关闭...`);
    server.close(async () => {
      await closePool();
      log.info('服务器已关闭');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  log.error('启动失败', { error: String(err) });
  process.exit(1);
});
