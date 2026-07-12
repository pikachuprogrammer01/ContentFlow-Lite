/**
 * server/utils/logger.ts — 统一日志模块
 *
 * 对标 Spring Boot Logger 设计：
 *   - 每模块获取自己的命名 Logger
 *   - 五级日志（TRACE / DEBUG / INFO / WARN / ERROR）
 *   - Console Transport（彩色输出）
 *   - Custom MySQL Transport（生产环境写 app_logs 表）
 *
 * 环境变量控制：
 *   LOG_LEVEL=info  — 全局输出级别
 *   LOG_TO_DB=true  — 是否写数据库
 */

import winston from 'winston';
import Transport from 'winston-transport';

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const LOG_TO_DB = process.env.LOG_TO_DB !== 'false';

/**
 * 日志级别映射：将 TRACE 映射到 winston 的 silly 级别。
 * 支持 TRACE | DEBUG | INFO | WARN | ERROR
 */
const levels: Record<string, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

/** Console Transport — 开发环境彩色输出 */
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.printf(({ timestamp, level, module, message, ...detail }) => {
      const prefix = module ? `[${module}]` : '';
      const detailStr = Object.keys(detail).length
        ? ` ${JSON.stringify(detail)}`
        : '';
      return `${timestamp} ${level} ${prefix} ${message}${detailStr}`;
    }),
  ),
});

const transports: winston.transport[] = [consoleTransport];

/** 基础 winston logger 实例 */
const baseLogger = winston.createLogger({
  levels,
  level: LOG_LEVEL,
  transports,
});

/**
 * 为指定模块创建命名 Logger。
 *
 * @example
 *   const log = createLogger('workflow');
 *   log.info('生成开始', { topic: '春日穿搭', platform: 'xiaohongshu' });
 *   log.error('AI 调用失败', { code: 'PROVIDER_ERROR', traceId: 'xxx' });
 */
export function createLogger(module: string) {
  const child = baseLogger.child({ module });

  return {
    error: (msg: string, detail?: Record<string, unknown>) =>
      child.error({ message: msg, ...detail }),
    warn: (msg: string, detail?: Record<string, unknown>) =>
      child.warn({ message: msg, ...detail }),
    info: (msg: string, detail?: Record<string, unknown>) =>
      child.info({ message: msg, ...detail }),
    debug: (msg: string, detail?: Record<string, unknown>) =>
      child.debug({ message: msg, ...detail }),
    trace: (msg: string, detail?: Record<string, unknown>) =>
      child.log('trace', { message: msg, ...detail }),
  };
}

/**
 * 动态添加 MySQL Transport。
 * 在数据库连接池就绪后调用，使日志持久化到 app_logs 表。
 *
 * @param pool - mysql2/promise 连接池实例
 */
export function attachMySQLTransport(pool: import('mysql2/promise').Pool): void {
  if (!LOG_TO_DB) return;

  const MySQLTransport = createMySQLTransportClass(pool);
  baseLogger.add(new MySQLTransport());
}

/**
 * 创建 Custom MySQL Transport 类。
 * 自写实现（不依赖 winston-mysql，该包已无人维护）。
 */
function createMySQLTransportClass(pool: import('mysql2/promise').Pool) {
  return class extends Transport {
    constructor() {
      super({ level: 'info' });
    }

    async log(
      info: { level: string; module?: string; message: string; [key: string]: unknown },
      callback: () => void,
    ) {
      setImmediate(() => callback());

      try {
        const detail: Record<string, unknown> = { ...info };
        // 移除内部字段，只保留自定义 context
        delete detail.level;
        delete detail.module;
        delete detail.message;
        delete detail.timestamp;

        await pool.query(
          `INSERT INTO app_logs (level, module, message, detail, created_at)
           VALUES (?, ?, ?, ?, NOW(3))`,
          [info.level, info.module || '', info.message, JSON.stringify(detail)],
        );
      } catch (err) {
        // DB 写入失败不阻塞应用，fallback 到 console
        console.error('[MySQLTransport] 写入失败:', String(err));
      }
    }
  };
}
