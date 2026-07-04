/**
 * Exporter — 系统统一导出模块
 *
 * 职责：
 * - Markdown 导出
 * - JSON 导出
 *
 * 只能读取 Content DTO，不得修改 DTO。
 */

import type { Content, Exporter, ExportFormat } from '@/types';

/**
 * Markdown Exporter
 */
class MarkdownExporter implements Exporter {
  readonly format: ExportFormat = 'markdown';

  export(content: Content): string {
    const lines: string[] = [];

    // 标题
    const selectedTitle =
      content.titles.length > 0 ? content.titles[0].text : content.topic;
    lines.push(`# ${selectedTitle}`);
    lines.push('');

    // 摘要
    if (content.summary) {
      lines.push(`> ${content.summary}`);
      lines.push('');
    }

    // 封面
    lines.push('## 封面');
    lines.push(`**${content.cover.title}**`);
    if (content.cover.subtitle) {
      lines.push(`*${content.cover.subtitle}*`);
    }
    lines.push('');

    // 正文分页
    lines.push('## 正文');
    lines.push('');

    content.pages.forEach((page, index) => {
      if (page.title) {
        lines.push(`### ${page.title}`);
      }
      if (page.content) {
        lines.push(page.content);
      }
      if (page.imagePrompt) {
        lines.push(`> 图片 Prompt: ${page.imagePrompt}`);
      }
      if (index < content.pages.length - 1) {
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    });

    lines.push('');

    // 标签
    if (content.tags.length > 0) {
      lines.push('## 标签');
      lines.push('');
      lines.push(content.tags.map((t) => `#${t}`).join(' '));
      lines.push('');
    }

    // 备选标题
    if (content.titles.length > 1) {
      lines.push('## 备选标题');
      lines.push('');
      content.titles.forEach((t) => {
        lines.push(`- ${t.text}`);
      });
      lines.push('');
    }

    // Metadata
    lines.push('---');
    lines.push(`*由 ContentFlow Lite 生成*`);
    lines.push(
      `*Prompt: ${content.metadata.promptId}@${content.metadata.promptVersion}*`,
    );
    lines.push(`*生成时间: ${content.metadata.createdAt}*`);

    return lines.join('\n');
  }
}

/**
 * JSON Exporter
 */
class JsonExporter implements Exporter {
  readonly format: ExportFormat = 'json';

  export(content: Content): string {
    return JSON.stringify(content, null, 2);
  }
}

// 导出器注册表
const exporters: Map<ExportFormat, Exporter> = new Map();
exporters.set('markdown', new MarkdownExporter());
exporters.set('json', new JsonExporter());

/**
 * 获取指定格式的导出器
 */
export function getExporter(format: ExportFormat): Exporter {
  const exporter = exporters.get(format);
  if (!exporter) {
    throw Object.assign(new Error(`不支持的导出格式: ${format}`), {
      code: 'EXPORT_ERROR',
    });
  }
  return exporter;
}

/**
 * 导出内容为指定格式字符串
 */
export function exportContent(content: Content, format: ExportFormat): string {
  const exporter = getExporter(format);
  return exporter.export(content);
}
