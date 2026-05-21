import { db } from '../config/database';
import { redis } from '../config/redis';
import { userTable, nodeTable, userTrafficLogTable } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * 格式化展示流量单位
 */
function formatTraffic(bytes: bigint): string {
  const kb = 1024n;
  const mb = 1024n * 1024n;
  const gb = 1024n * 1024n * 1024n;
  const tb = 1024n * 1024n * 1024n * 1024n;

  if (bytes >= tb) {
    return (Number(bytes) / Number(tb)).toFixed(2) + ' TB';
  } else if (bytes >= gb) {
    return (Number(bytes) / Number(gb)).toFixed(2) + ' GB';
  } else if (bytes >= mb) {
    return (Number(bytes) / Number(mb)).toFixed(2) + ' MB';
  } else if (bytes >= kb) {
    return (Number(bytes) / Number(kb)).toFixed(2) + ' KB';
  } else {
    return bytes.toString() + ' B';
  }
}

/**
 * 消费并合并 Redis 流量缓存队列落盘的核心任务
 */
export async function runCheckJob(): Promise<void> {
  const logs: any[] = [];

  // A. 原子弹出队列中累积的所有流量消耗包
  while (true) {
    const item = await redis.lpop('queue:traffic:incoming');
    if (!item) break;
    try {
      logs.push(JSON.parse(item));
    } catch (e) {
      // 容错机制：忽略无效格式
    }
  }

  if (logs.length === 0) {
    return;
  }

  console.log(`[Worker] 正在合并消费 ${logs.length} 条节点流量消耗记录...`);

  // B. 内存中按 userId + nodeId 进行合并汇总聚合，将并发压力压缩至极致
  interface TrafficSum {
    u: bigint;
    d: bigint;
  }
  const aggMap = new Map<string, TrafficSum>();

  for (const log of logs) {
    const key = `${log.userId}:${log.nodeId}`;
    const cur = aggMap.get(key) || { u: 0n, d: 0n };
    aggMap.set(key, {
      u: cur.u + BigInt(log.u),
      d: cur.d + BigInt(log.d)
    });
  }

  // C. 收集节点列表以拉取流量计算率
  const nodeIds = Array.from(new Set(logs.map(l => l.nodeId)));
  const nodeRateMap = new Map<number, string>();

  if (nodeIds.length > 0) {
    try {
      const nodes = await db.select({ id: nodeTable.id, trafficRate: nodeTable.trafficRate })
        .from(nodeTable)
        .where(inArray(nodeTable.id, nodeIds));
      for (const n of nodes) {
        nodeRateMap.set(n.id, n.trafficRate);
      }
    } catch (err) {
      console.error('[Worker] 读取节点计费比率失败，将使用默认 1.00 比率：', err);
    }
  }

  // D. 开启强一致事务，悲观行锁合并更新用户表，并写入流量日志
  try {
    await db.transaction(async (tx) => {
      for (const [keyStr, sum] of aggMap.entries()) {
        const [userId, nodeId] = keyStr.split(':').map(Number);
        
        // 1. 获取并锁死目标用户行记录
        const users = await tx.select({ u: userTable.u, d: userTable.d })
          .from(userTable)
          .where(eq(userTable.id, userId))
          .for('update');

        if (users.length === 0) {
          continue; // 忽略无效用户
        }

        const user = users[0];

        // 2. 累加流量写入数据库
        await tx.update(userTable)
          .set({
            u: user.u + sum.u,
            d: user.d + sum.d
          })
          .where(eq(userTable.id, userId));

        // 3. 记录精细的消费账单日志
        const rate = nodeRateMap.get(nodeId) || '1.00';
        const total = sum.u + sum.d;
        const formatted = formatTraffic(total);

        await tx.insert(userTrafficLogTable).values({
          userId: userId,
          u: sum.u,
          d: sum.d,
          nodeId: nodeId,
          rate: rate,
          traffic: formatted,
          logTime: Math.floor(Date.now() / 1000)
        });
      }
    });

    console.log(`[Worker] 成功合并处理 ${aggMap.size} 个账户的流量消耗变动，审计日志写入成功。`);
  } catch (txError) {
    console.error('[Worker] 流量事务批更新合并落盘失败，重新放回 Redis 队列备用：', txError);
    
    // 容错：事务失败时将未消费数据放回队列
    const pipeline = redis.pipeline();
    for (const log of logs) {
      pipeline.rpush('queue:traffic:incoming', JSON.stringify(log));
    }
    await pipeline.exec();
  }
}
