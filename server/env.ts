/**
 * server/env.ts — 环境变量初始化
 *
 * 必须在所有其他模块之前 import，确保 process.env 在 config.ts 加载时已就绪。
 * ESM 静态 import 按声明顺序执行：此文件作为 index.ts 第一个 import 时，
 * 其模块级代码在所有后续 import 之前完成。
 */

import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 优先 server/ 自身目录的 .env（解耦），不存在则回退到 monorepo 根目录（兼容旧布局）
const localEnv = resolve(__dirname, '.env');
const rootEnv = resolve(__dirname, '..', '.env');
dotenv.config({ path: existsSync(localEnv) ? localEnv : rootEnv });
