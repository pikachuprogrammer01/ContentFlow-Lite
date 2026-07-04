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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env 在项目根目录（server/ 的父目录）
dotenv.config({ path: resolve(__dirname, '..', '.env') });
