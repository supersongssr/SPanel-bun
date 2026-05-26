import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { configTable } from '../../db/schema';
import { authDerive, requireAdmin } from '../../middleware/auth';
import { setConfig } from '../../config/app';

export const adminSettingsController = new Elysia({ prefix: '/admin' })
  .derive(authDerive)
  /**
   * 拉取所有系统全局配置参数
   */
  .get('/settings', async ({ userId, isAdmin, set }) => {
    requireAdmin({ userId, isAdmin, set });

    try {
      const dbConfigs = await db.select().from(configTable);
      const configs: Record<string, string> = {};
      
      for (const conf of dbConfigs) {
        configs[conf.name] = conf.value || '';
      }

      return {
        status: 'success',
        data: configs
      };
    } catch (err: any) {
      set.status = 500;
      return {
        status: 'error',
        message: '读取配置数据失败：' + err.message
      };
    }
  })

  /**
   * 批量更新系统全局配置参数并热同步至 Redis 和内存缓冲中
   */
  .post('/settings', async ({ userId, isAdmin, body, set }) => {
    requireAdmin({ userId, isAdmin, set });

    try {
      // 批量处理并持久化每个参数配置
      for (const [name, value] of Object.entries(body)) {
        await setConfig(name, String(value));
      }

      return {
        status: 'success',
        message: '系统配置参数更新成功！'
      };
    } catch (err: any) {
      set.status = 500;
      return {
        status: 'error',
        message: '更新配置数据失败：' + err.message
      };
    }
  }, {
    body: t.Record(t.String(), t.Any())
  });
