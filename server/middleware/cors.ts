/**
 * server/middleware/cors.ts — CORS 中间件
 *
 * 跨域请求控制。根据环境变量 CORS_ORIGIN 配置允许的来源。
 * 默认允许所有来源（开发模式），生产环境应限定为前端域名。
 */

import cors from 'cors';
import { config } from '../config.js';

export const corsMiddleware = cors({
  origin: config.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
