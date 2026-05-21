import { db } from '../config/database';
import { userTable } from '../db/schema';
import { eq, lte, and, gt, inArray } from 'drizzle-orm';

/**
 * 每日零点自动清算与流量重置结算任务 (Daily Cron)
 */
export async function runDailyJob(): Promise<void> {
  console.log('⏰ 正在执行每日零点财务与流量结算清算任务 (Daily Job)...');

  const now = new Date();

  try {
    // 1. 会员等级到期自动降级 (classExpire <= now 且 class > 0)
    const expiredClasses = await db.select({ id: userTable.id })
      .from(userTable)
      .where(
        and(
          lte(userTable.classExpire, now),
          gt(userTable.class, 0)
        )
      );

    if (expiredClasses.length > 0) {
      const ids = expiredClasses.map(u => u.id);
      await db.update(userTable)
        .set({ class: 0 })
        .where(inArray(userTable.id, ids));
      console.log(`[DailyJob] 成功自动降级 ${ids.length} 个已过期的会员等级账户。`);
    }

    // 2. 整个账户期限到期自动封锁 (expireIn <= now 且 enable === 1)
    const expiredAccounts = await db.select({ id: userTable.id })
      .from(userTable)
      .where(
        and(
          lte(userTable.expireIn, now),
          eq(userTable.enable, 1)
        )
      );

    if (expiredAccounts.length > 0) {
      const ids = expiredAccounts.map(u => u.id);
      await db.update(userTable)
        .set({ enable: 0 })
        .where(inArray(userTable.id, ids));
      console.log(`[DailyJob] 成功封锁禁用 ${ids.length} 个过期的会员整体账号。`);
    }

    // 3. 流量月度自动重置 (根据 autoResetDay 匹配重置)
    const today = now.getDate();
    const resetUsers = await db.select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.autoResetDay, today));

    if (resetUsers.length > 0) {
      const ids = resetUsers.map(u => u.id);
      await db.update(userTable)
        .set({ u: 0n, d: 0n })
        .where(inArray(userTable.id, ids));
      console.log(`[DailyJob] 成功为 ${ids.length} 个用户重置本月流量 (当前重置周期日为每月 ${today} 日)。`);
    }

    console.log('✅ 每日结算任务全部清算处理完毕！');
  } catch (error) {
    console.error('❌ 每日结算任务在运行中遭遇异常崩溃：', error);
  }
}
