/**
 * server/config.ts — 配置加载
 *
 * 双层配置合并：
 *   1. .env 环境变量（dotenv 已在 index.ts 入口调用）
 *   2. config.json 运行时配置（数据库热切换时写入）
 *
 * 优先级：config.json > .env
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ConfigJSON {
  db?: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    ssl?: boolean;
  };
}

/** 从项目根目录加载 config.json（若存在） */
function loadConfigJSON(): ConfigJSON {
  const configPath = resolve(__dirname, '..', 'config.json');
  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, 'utf-8');
      return JSON.parse(raw) as ConfigJSON;
    } catch {
      // config.json 损坏时不阻塞启动
      return {};
    }
  }
  return {};
}

const configJSON = loadConfigJSON();

/** 最终合并后的应用配置 */
export const config = {
  port: Number(process.env.PORT) || 3001,

  db: {
    host: configJSON.db?.host || process.env.DB_HOST || '127.0.0.1',
    port: configJSON.db?.port || Number(process.env.DB_PORT) || 3306,
    user: configJSON.db?.user || process.env.DB_USER || 'root',
    password: configJSON.db?.password || process.env.DB_PASSWORD || '',
    database: configJSON.db?.database || process.env.DB_DATABASE || 'contentflow',
    ssl: configJSON.db?.ssl ?? process.env.DB_SSL === 'true',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-jwt-refresh-secret-change-in-production',
  },

  encryptionKey: process.env.ENCRYPTION_KEY || '0'.repeat(64),

  admin: {
    email: process.env.ADMIN_EMAIL || '',
    passwordHash: process.env.ADMIN_PASSWORD_HASH || '',
    cookieSecret: process.env.ADMIN_COOKIE_SECRET || 'admin-cookie-secret-change-me',
  },

  redis: {
    url: process.env.REDIS_URL || '',
  },

  image: {
    timeout: Number(process.env.IMAGE_TIMEOUT) || 15,
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
    toDB: process.env.LOG_TO_DB !== 'false',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};

export default config;
