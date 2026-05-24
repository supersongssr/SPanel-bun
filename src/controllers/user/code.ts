import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { codeTable, userTable } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authDerive, requireAuth } from '../../middleware/auth';

export const userCodeController = new Elysia({ prefix: '/user' })
  .derive(authDerive)
  /**
   * 1. 激活/兑换充值卡密
   */
  .post('/code/activate', async ({ userId, body, set }) => {
    requireAuth({ userId, set });

    const uid = BigInt(userId!);
    const { code } = body;

    try {
      const result = await db.transaction(async (tx) => {
        // 1. 查询卡密状态 (悲观行锁)
        const codes = await tx.select()
          .from(codeTable)
          .where(eq(codeTable.code, code))
          .for('update');

        if (codes.length === 0) {
          throw new Error('您输入的激活卡密不存在，请检查后重试。');
        }

        const codeRecord = codes[0];
        if (codeRecord.isused === 1) {
          throw new Error('该卡密已经被兑换使用过了，无法重复激活。');
        }

        // 2. 锁定并查询当前会员账户
        const users = await tx.select()
          .from(userTable)
          .where(eq(userTable.id, Number(uid)))
          .for('update');

        if (users.length === 0) {
          throw new Error('会员账户不存在。');
        }

        const user = users[0];
        const amount = Number(codeRecord.number);

        let updateFields: any = {};
        let successMessage = '';

        if (codeRecord.type === 1) {
          // 余额卡充值
          const currentMoney = Number(user.money);
          const newMoney = (currentMoney + amount).toFixed(2);
          updateFields.money = newMoney;
          successMessage = `充值成功！成功为您的钱包账户充值了 ￥${amount.toFixed(2)} 元，当前可用余额为 ￥${newMoney} 元。`;
        } else if (codeRecord.type === 2) {
          // 流量卡兑换
          const currentTransfer = BigInt(user.transferEnable);
          const addBytes = BigInt(Math.floor(amount * 1024 * 1024 * 1024)); // GB to Bytes
          const newTransfer = currentTransfer + addBytes;
          updateFields.transferEnable = newTransfer;
          
          // 格式化流量大小显示
          const formattedTraffic = amount.toFixed(1) + ' GB';
          successMessage = `兑换成功！成功为您的连接节点账户充值了 ${formattedTraffic} 可用流量额度！`;
        } else {
          throw new Error('未知的充值卡类型，请联系系统管理员。');
        }

        // 3. 执行更新用户余额/流量
        await tx.update(userTable)
          .set(updateFields)
          .where(eq(userTable.id, user.id));

        // 4. 更新卡密为已使用
        await tx.update(codeTable)
          .set({
            isused: 1,
            userId: uid,
            usedatetime: new Date()
          })
          .where(eq(codeTable.id, codeRecord.id));

        return {
          message: successMessage
        };
      });

      return {
        status: 'success',
        message: result.message
      };
    } catch (err: any) {
      set.status = 400;
      return {
        status: 'error',
        message: err.message || '卡密激活兑换失败，请稍后再试。'
      };
    }
  }, {
    body: t.Object({
      code: t.String()
    })
  })

  /**
   * 2. 查询当前用户的卡密使用历史流水
   */
  .get('/code/history', async ({ userId, set }) => {
    requireAuth({ userId, set });

    const uid = BigInt(userId!);

    const list = await db.select()
      .from(codeTable)
      .where(
        and(
          eq(codeTable.userId, uid),
          eq(codeTable.isused, 1)
        )
      )
      .orderBy(desc(codeTable.id));

    return {
      status: 'success',
      data: list.map(c => ({
        id: c.id,
        code: c.code,
        type: c.type === 1 ? '余额充值卡' : '流量兑换卡',
        number: c.number,
        used_at: c.usedatetime ? c.usedatetime.toISOString().replace('T', ' ').substring(0, 19) : ''
      }))
    };
  });
