/**
 * server/db/schema.ts — 8 张核心表的建表 SQL
 *
 * 所有表使用 IF NOT EXISTS，可安全重复执行。
 * 兼容 MySQL 5.7+ / TiDB / MariaDB / PlanetScale / RDS 等 MySQL 兼容数据库。
 */

/** 建表语句列表（按依赖顺序排列） */
export const TABLE_SCHEMAS: { name: string; sql: string }[] = [
  {
    name: 'users',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id            VARCHAR(64)   PRIMARY KEY COMMENT '用户唯一 ID',
        username      VARCHAR(100)  NOT NULL UNIQUE COMMENT '用户名',
        email         VARCHAR(200)  NOT NULL UNIQUE COMMENT '邮箱',
        password_hash VARCHAR(255)  NOT NULL COMMENT 'bcrypt 哈希',
        role          ENUM('admin','user') NOT NULL DEFAULT 'user' COMMENT '角色权限',
        created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) COMMENT='用户表';
    `,
  },
  {
    name: 'contents',
    sql: `
      CREATE TABLE IF NOT EXISTS contents (
        id          VARCHAR(64)   PRIMARY KEY COMMENT 'Content DTO 的 id',
        user_id     VARCHAR(64)   NOT NULL COMMENT '所属用户',
        topic       VARCHAR(500)  NOT NULL COMMENT '生成主题',
        platform    VARCHAR(50)   NOT NULL COMMENT '平台：xiaohongshu/douyin',
        titles      JSON          NOT NULL COMMENT 'Title[] 数组',
        cover       JSON          NOT NULL COMMENT 'Cover {title, subtitle}',
        pages       JSON          NOT NULL COMMENT 'Page[] 数组',
        tags        JSON          NOT NULL COMMENT 'string[] 标签',
        summary     TEXT          COMMENT '内容摘要',
        extra_requirements TEXT   COMMENT '用户输入的补充要求',
        metadata    JSON          NOT NULL COMMENT 'Metadata {promptId, version, model...}',
        created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_platform (platform),
        INDEX idx_created_at (created_at)
      ) COMMENT='内容表 — 存储 Content DTO';
    `,
  },
  {
    name: 'prompt_templates',
    sql: `
      CREATE TABLE IF NOT EXISTS prompt_templates (
        id            VARCHAR(64)   PRIMARY KEY COMMENT '模板唯一 ID',
        user_id       VARCHAR(64)   NOT NULL COMMENT '所属用户',
        name          VARCHAR(200)  NOT NULL COMMENT '模板名称',
        type          ENUM('text','image') NOT NULL DEFAULT 'text' COMMENT '模板类型：text=文字生成，image=图片生成',
        is_default    TINYINT(1)  NOT NULL DEFAULT 0 COMMENT '是否默认模板',
        platform      VARCHAR(50)   NOT NULL COMMENT '目标平台（文字模板）/ 图片风格标识（图片模板）',
        system_prompt TEXT          NOT NULL COMMENT 'System Prompt 内容',
        user_prompt   TEXT          NOT NULL COMMENT 'User Prompt 模板（含 {{变量}}）',
        created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_type (type),
        INDEX idx_platform (platform)
      ) COMMENT='Prompt 模板表 — type 区分文字/图片版本';
    `,
  },
  {
    name: 'prompt_versions',
    sql: `
      CREATE TABLE IF NOT EXISTS prompt_versions (
        id          VARCHAR(64)   PRIMARY KEY COMMENT '版本唯一 ID',
        prompt_id   VARCHAR(64)   NOT NULL COMMENT '关联的模板 ID',
        version     VARCHAR(20)   NOT NULL COMMENT '版本号，如 V1、V2、V3',
        content     JSON          NOT NULL COMMENT 'PromptTemplate 完整快照',
        created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_prompt_version (prompt_id, version),
        INDEX idx_prompt_id (prompt_id)
      ) COMMENT='Prompt 版本表 — 不可覆盖，只增不改';
    `,
  },
  {
    name: 'generation_records',
    sql: `
      CREATE TABLE IF NOT EXISTS generation_records (
        id              VARCHAR(64)   PRIMARY KEY COMMENT '记录唯一 ID',
        user_id         VARCHAR(64)   NOT NULL COMMENT '所属用户',
        content_id      VARCHAR(64)   NOT NULL COMMENT '关联的 Content ID',
        topic           VARCHAR(500)  NOT NULL COMMENT '生成主题（冗余）',
        platform        VARCHAR(50)   NOT NULL COMMENT '平台（冗余）',
        prompt_id       VARCHAR(64)   NOT NULL COMMENT '使用的 Prompt ID',
        prompt_version  VARCHAR(20)   NOT NULL COMMENT '使用的 Prompt 版本',
        model           VARCHAR(100)  NOT NULL COMMENT 'AI 模型名称',
        created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_content_id (content_id),
        INDEX idx_prompt_id (prompt_id),
        INDEX idx_created_at (created_at)
      ) COMMENT='生成记录表 — 追踪每次 AI 生成';
    `,
  },
  {
    name: 'user_settings',
    sql: `
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id   VARCHAR(64)  NOT NULL COMMENT '所属用户',
        \`key\`     VARCHAR(100) NOT NULL COMMENT '设置键（如 gemini_api_key）',
        \`value\`   TEXT         NOT NULL COMMENT '设置值',
        updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, \`key\`),
        INDEX idx_user_id (user_id)
      ) COMMENT='用户设置表 — API Key、偏好等键值对';
    `,
  },
  {
    name: 'publish_records',
    sql: `
      CREATE TABLE IF NOT EXISTS publish_records (
        id           VARCHAR(64)  PRIMARY KEY COMMENT '记录唯一 ID',
        user_id      VARCHAR(64)  NOT NULL COMMENT '所属用户',
        content_id   VARCHAR(64)  NOT NULL COMMENT '关联的 Content ID',
        platform     VARCHAR(50)  NOT NULL COMMENT '发布平台：xiaohongshu/douyin/gongzhonghao',
        title_used   VARCHAR(500) COMMENT '实际使用的标题',
        published_at DATETIME     COMMENT '用户标记的发布时间',
        notes        TEXT         COMMENT '用户备注',
        created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_content (user_id, content_id),
        INDEX idx_platform (platform)
      ) COMMENT='发布记录表 — 追踪内容发布到哪些平台';
    `,
  },
  {
    name: 'app_logs',
    sql: `
      CREATE TABLE IF NOT EXISTS app_logs (
        id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        level       VARCHAR(10)  NOT NULL COMMENT 'TRACE/DEBUG/INFO/WARN/ERROR',
        message     TEXT         NOT NULL,
        module      VARCHAR(100) COMMENT '来源模块，如 workflow/gemini-provider',
        user_id     VARCHAR(64)  COMMENT '相关用户',
        trace_id    VARCHAR(64)  COMMENT 'Workflow ID 或请求 trace id',
        detail      JSON         COMMENT '额外上下文（错误栈/参数等）',
        created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_level (level),
        INDEX idx_module (module),
        INDEX idx_trace_id (trace_id),
        INDEX idx_created_at (created_at)
      ) COMMENT='应用日志表';
    `,
  },
];

/**
 * 获取所有建表 SQL 语句的合并文本。
 * 用于一次性执行所有建表操作。
 */
export function getAllCreateTableSQL(): string {
  return TABLE_SCHEMAS.map((t) => t.sql.trim()).join('\n\n');
}

/**
 * 初始化所有表。使用传入的连接池执行建表 SQL。
 * 使用 IF NOT EXISTS，可安全重复执行。
 */
export async function initTables(pool: import('mysql2/promise').Pool): Promise<string[]> {
  const created: string[] = [];
  for (const table of TABLE_SCHEMAS) {
    await pool.query(table.sql);
    created.push(table.name);
  }
  return created;
}
