import { Elysia } from 'elysia';
import { db } from '../../config/database';
import { userTable, nodeTable, boughtTable } from '../../db/schema';
import { sql } from 'drizzle-orm';
import { authDerive, requireAdmin } from '../../middleware/auth';

export const adminDashboardController = new Elysia({ prefix: '/admin' })
  .derive(authDerive)
  /**
   * 获取管理员全局运营指标数据与监控面板图表
   */
  .get('/dashboard', async ({ userId, isAdmin, set }) => {
    requireAdmin({ userId, isAdmin, set });

    // 1. 统计用户总量与活跃量
    const userStats = await db.select({
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when (u > 0 or d > 0) then 1 else 0 end)`
    }).from(userTable);

    const totalUsers = Number(userStats[0]?.total || 0);
    const activeUsers = Number(userStats[0]?.active || 0);

    // 2. 统计节点总量
    const nodeStats = await db.select({
      total: sql<number>`count(*)`
    }).from(nodeTable);
    const totalNodes = Number(nodeStats[0]?.total || 0);

    // 3. 统计总销售额 (支付成功的已购订单价格累加)
    const revenueStats = await db.select({
      totalPrice: sql<string>`sum(price)`
    }).from(boughtTable);
    const totalRevenue = parseFloat(revenueStats[0]?.totalPrice || '0.00');

    // 4. 统计系统总已用流量 (上行与下行总和)
    const trafficStats = await db.select({
      totalU: sql<string>`sum(u)`,
      totalD: sql<string>`sum(d)`
    }).from(userTable);

    const totalU = BigInt(trafficStats[0]?.totalU || '0');
    const totalD = BigInt(trafficStats[0]?.totalD || '0');
    const totalTrafficBytes = totalU + totalD;

    // 5. 聚合最近 7 天的每日注册用户增长量以绘制折线图
    const regGrowthResult = await db.select({
      regDay: sql<string>`date(reg_date)`,
      count: sql<number>`count(*)`
    })
      .from(userTable)
      .groupBy(sql`date(reg_date)`)
      .orderBy(sql`date(reg_date) desc`)
      .limit(7);

    const growthChart = regGrowthResult.reverse().map(item => ({
      date: item.regDay ? new Date(item.regDay).toISOString().split('T')[0] : '未知',
      count: item.count
    }));

    return {
      status: 'success',
      data: {
        metrics: {
          total_users: totalUsers,
          active_users: activeUsers,
          total_nodes: totalNodes,
          total_revenue: totalRevenue.toFixed(2),
          total_traffic_bytes: totalTrafficBytes.toString(),
        },
        charts: {
          user_growth: growthChart
        }
      }
    };
  });
