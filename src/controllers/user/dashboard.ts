import { Elysia } from 'elysia';
import { db } from '../../config/database';
import { userTable, announcementTable } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authDerive, requireAuth } from '../../middleware/auth';
import { getConfig } from '../../config/app';


export const userDashboardController = new Elysia({ prefix: '/user' })
  .derive(authDerive)
  /**
   * 获取用户控制面板首页统计数据与公告
   */
  .get('/dashboard', async ({ userId, set }) => {
    requireAuth({ userId, set });

    const uid = userId!;
    const users = await db.select().from(userTable).where(eq(userTable.id, uid)).limit(1);
    if (users.length === 0) {
      set.status = 404;
      return { status: 'error', message: '用户账号不存在。' };
    }

    const user = users[0];

    // 1. 系统公告拉取 (取最新 5 条)
    const announcements = await db.select()
      .from(announcementTable)
      .orderBy(desc(announcementTable.id))
      .limit(5);

    // 2. 签到状态审计
    const lastCheckinTime = user.lastCheckInTime;
    let canCheckin = true;
    let lastCheckinStr = 'Never';

    if (lastCheckinTime > 0) {
      const lastDate = new Date(lastCheckinTime * 1000);
      const todayStr = new Date().toISOString().split('T')[0];
      const lastCheckinDayStr = lastDate.toISOString().split('T')[0];
      if (lastCheckinDayStr === todayStr) {
        canCheckin = false;
      }
      lastCheckinStr = lastDate.toISOString().replace('T', ' ').substring(0, 19);
    }

    const appName = getConfig('appName', 'SPanel-bun 代理中心');
    const subDomainsRaw = getConfig('subDomains', '');
    const sub_domains = subDomainsRaw
      ? subDomainsRaw.split(',').map(d => d.trim()).filter(Boolean)
      : [];

    return {
      status: 'success',
      data: {
        money: user.money,
        u: user.u.toString(),
        d: user.d.toString(),
        transfer_enable: user.transferEnable.toString(),
        class: user.class,
        class_expire: user.classExpire ? user.classExpire.toISOString().replace('T', ' ').substring(0, 19) : '',
        checked_in: !canCheckin,
        checkin_status: {
          can_checkin: canCheckin,
          last_checkin_time: lastCheckinStr
        },
        announcements: announcements.map(ann => ({
          id: ann.id,
          date: ann.date ? ann.date.toISOString().replace('T', ' ').substring(0, 19) : '',
          content: ann.content,
          markdown: ann.markdown
        })),
        appName,
        sub_domains,
        token: user.passwd
      }
    };
  })

  /**
   * 用户每日签到接口 (使用悲观更新锁 tx.select().for('update') 防CC重复刷取)
   */
  .post('/checkin', async ({ userId, set }) => {
    requireAuth({ userId, set });

    const uid = userId!;

    try {
      const result = await db.transaction(async (tx) => {
        // 悲观行锁锁定当前用户记录
        const rows = await tx.select()
          .from(userTable)
          .where(eq(userTable.id, uid))
          .for('update');

        if (rows.length === 0) {
          throw new Error('用户账号不存在。');
        }

        const user = rows[0];

        // 检查今天是否签到过
        const lastCheckinTime = user.lastCheckInTime;
        if (lastCheckinTime > 0) {
          const lastDate = new Date(lastCheckinTime * 1000);
          const todayStr = new Date().toISOString().split('T')[0];
          const lastCheckinDayStr = lastDate.toISOString().split('T')[0];
          if (lastCheckinDayStr === todayStr) {
            throw new Error('您今天已经签到过了，请明天再来。');
          }
        }

        // 奖励 100MB - 500MB
        const randomMB = Math.floor(Math.random() * (500 - 100 + 1)) + 100;
        const rewardBytes = BigInt(randomMB) * 1024n * 1024n;
        const nextTransfer = BigInt(user.transferEnable) + rewardBytes;

        await tx.update(userTable)
          .set({
            transferEnable: nextTransfer,
            lastCheckInTime: Math.floor(Date.now() / 1000)
          })
          .where(eq(userTable.id, uid));

        return {
          rewardBytes,
          nextTransfer
        };
      });

      return {
        status: 'success',
        data: {
          traffic: result.rewardBytes.toString(),
          checked_in: true
        }
      };
    } catch (err: any) {
      set.status = 400;
      return {
        status: 'error',
        message: err.message || '签到失败，请稍后再试。'
      };
    }
  });
