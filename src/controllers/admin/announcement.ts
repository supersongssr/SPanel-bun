import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { announcementTable } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authDerive, requireAdmin } from '../../middleware/auth';

/**
 * 极简的服务器端 Markdown 转 HTML 渲染器，防止前端未传入 content 时提供兜底
 */
function simpleMarkdownToHtml(md: string): string {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 标题转译
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // 粗体
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

  // 引用
  html = html.replace(/^\s*&gt;\s+(.*$)/gim, '<blockquote>$1</blockquote>');

  // 列表项目
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/^\s*\*\s+(.*$)/gim, '<li>$1</li>');

  // 段落换行
  html = html.replace(/\n$/gim, '<br />');

  return html;
}

export const adminAnnouncementController = new Elysia({ prefix: '/admin' })
  .derive(authDerive)
  /**
   * 1. 拉取全部公告列表
   */
  .get('/announcement', async ({ userId, isAdmin, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const list = await db.select()
      .from(announcementTable)
      .orderBy(desc(announcementTable.id));

    return {
      status: 'success',
      data: list.map(ann => ({
        id: ann.id,
        date: ann.date ? ann.date.toISOString().replace('T', ' ').substring(0, 19) : '',
        content: ann.content,
        markdown: ann.markdown
      }))
    };
  })

  /**
   * 2. 创建公告
   */
  .post('/announcement', async ({ userId, isAdmin, body, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const { markdown, content } = body;
    const finalContent = content || simpleMarkdownToHtml(markdown);

    const result = await db.insert(announcementTable).values({
      date: new Date(),
      content: finalContent,
      markdown: markdown
    });

    return {
      status: 'success',
      message: '公告创建并发布成功！',
      data: {
        id: result[0]?.insertId
      }
    };
  }, {
    body: t.Object({
      markdown: t.String(),
      content: t.Optional(t.String())
    })
  })

  /**
   * 3. 更新公告
   */
  .put('/announcement/:id', async ({ userId, isAdmin, params, body, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const annId = Number(params.id);
    const { markdown, content } = body;

    const rows = await db.select().from(announcementTable).where(eq(announcementTable.id, annId)).limit(1);
    if (rows.length === 0) {
      set.status = 404;
      return { status: 'error', message: '该公告不存在。' };
    }

    const finalContent = content || simpleMarkdownToHtml(markdown);

    await db.update(announcementTable)
      .set({
        content: finalContent,
        markdown: markdown,
        date: new Date() // 更新时间为当前时间
      })
      .where(eq(announcementTable.id, annId));

    return {
      status: 'success',
      message: '公告更新成功！'
    };
  }, {
    body: t.Object({
      markdown: t.String(),
      content: t.Optional(t.String())
    })
  })

  /**
   * 4. 删除公告
   */
  .delete('/announcement/:id', async ({ userId, isAdmin, params, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const annId = Number(params.id);

    const rows = await db.select().from(announcementTable).where(eq(announcementTable.id, annId)).limit(1);
    if (rows.length === 0) {
      set.status = 404;
      return { status: 'error', message: '该公告不存在。' };
    }

    await db.delete(announcementTable).where(eq(announcementTable.id, annId));

    return {
      status: 'success',
      message: '公告已成功物理删除。'
    };
  });
