import { Elysia, t } from 'elysia';
import { db } from '../../config/database';
import { userTable } from '../../db/schema';
import { eq, like, or } from 'drizzle-orm';
import { authDerive, requireAdmin, signToken } from '../../middleware/auth';

export const adminUserController = new Elysia({ prefix: '/admin' })
  .derive(authDerive)
  /**
   * 1. 获取所有用户列表 (支持模糊搜索 email 或用户名)
   */
  .get('/user', async ({ userId, isAdmin, query, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const search = query.search || '';
    
    let dbQuery = db.select().from(userTable);
    
    if (search.trim() !== '') {
      // @ts-ignore
      dbQuery = dbQuery.where(
        or(
          like(userTable.email, `%${search}%`),
          like(userTable.userName, `%${search}%`)
        )
      );
    }

    const list = await dbQuery;

    return {
      status: 'success',
      data: list.map(user => ({
        id: user.id,
        user_name: user.userName,
        email: user.email,
        port: user.port,
        passwd: user.passwd,
        money: user.money,
        class: user.class,
        class_expire: user.classExpire ? user.classExpire.toISOString().replace('T', ' ').substring(0, 19) : '',
        transfer_enable: user.transferEnable.toString(),
        u: user.u.toString(),
        d: user.d.toString(),
        enable: user.enable === 1,
        node_group: user.nodeGroup,
        is_admin: user.isAdmin === 1,
        reg_date: user.regDate ? user.regDate.toISOString().replace('T', ' ').substring(0, 19) : ''
      }))
    };
  }, {
    query: t.Object({
      search: t.Optional(t.String())
    })
  })

  /**
   * 2. 更新指定用户账户配置
   */
  .put('/user/:id', async ({ userId, isAdmin, params, body, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const targetUid = Number(params.id);
    const {
      user_name, email, password, passwd, money, transfer_enable,
      class: userClass, class_expire, enable, node_group, is_admin
    } = body;

    const rows = await db.select().from(userTable).where(eq(userTable.id, targetUid)).limit(1);
    if (rows.length === 0) {
      set.status = 404;
      return { status: 'error', message: '用户不存在。' };
    }

    // 构建更新载荷
    const updatePayload: any = {
      userName: user_name,
      email: email,
      passwd: passwd,
      money: money,
      transferEnable: BigInt(transfer_enable),
      class: userClass,
      classExpire: new Date(class_expire),
      enable: enable ? 1 : 0,
      nodeGroup: node_group,
      isAdmin: is_admin ? 1 : 0
    };

    // 如果管理员填了密码，则进行 bcrypt 哈希后覆盖
    if (password && password.trim() !== '') {
      updatePayload.pass = await Bun.password.hash(password, {
        algorithm: 'bcrypt',
        cost: 10
      });
    }

    await db.update(userTable)
      .set(updatePayload)
      .where(eq(userTable.id, targetUid));

    return {
      status: 'success',
      message: '用户配置更新成功！'
    };
  }, {
    body: t.Object({
      user_name: t.String(),
      email: t.String(),
      password: t.Optional(t.String()),
      passwd: t.String(),
      money: t.String(),
      transfer_enable: t.String(),
      class: t.Number(),
      class_expire: t.String(),
      enable: t.Boolean(),
      node_group: t.Number(),
      is_admin: t.Boolean()
    })
  })

  /**
   * 3. 会员身份伪装登录 (生成临时的短时效 JWT Token 以便管理员登录调试)
   */
  .post('/user/:id/masquerade', async ({ userId, isAdmin, params, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const targetUid = Number(params.id);

    const rows = await db.select().from(userTable).where(eq(userTable.id, targetUid)).limit(1);
    if (rows.length === 0) {
      set.status = 404;
      return { status: 'error', message: '用户不存在，无法执行伪装登录。' };
    }

    // 签发目标用户的 Token (isAdmin 为 false，因为是以目标用户的身份登录)
    const token = await signToken(targetUid, false);

    return {
      status: 'success',
      message: '成功签署伪装会话令牌！',
      data: {
        token: token
      }
    };
  })

  /**
   * 4. 物理删除用户
   */
  .delete('/user/:id', async ({ userId, isAdmin, params, set }) => {
    requireAdmin({ userId, isAdmin, set });

    const targetUid = Number(params.id);

    const rows = await db.select().from(userTable).where(eq(userTable.id, targetUid)).limit(1);
    if (rows.length === 0) {
      set.status = 404;
      return { status: 'error', message: '用户不存在。' };
    }

    await db.delete(userTable).where(eq(userTable.id, targetUid));

    return {
      status: 'success',
      message: '用户账户已物理删除。'
    };
  });
