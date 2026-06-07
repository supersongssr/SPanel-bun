import cron from 'node-cron';
import { runCheckJob } from './commands/checkjob';
import { runDailyJob } from './commands/dailyjob';
import { redis } from './config/redis';

console.log('⏰ SPanel-bun background Scheduler daemon started.');

// 1. 每 5 秒极速拉取合并消费 Redis 缓冲队列
setInterval(async () => {
  try {
    await runCheckJob();
  } catch (err) {
    console.error('[Scheduler] 运行流量合并 checkjob 失败:', err);
  }
}, 5000);

// 2. 每日零点整准时进行清算重置作业
cron.schedule('0 0 * * *', async () => {
  try {
    await runDailyJob();
  } catch (err) {
    console.error('[Scheduler] 运行财务清算 dailyjob 失败:', err);
  }
});

// 优雅的退出监听，防止 Redis 连接泄露
process.on('SIGINT', async () => {
  console.log('\n[Scheduler] Stopping scheduler daemon...');
  await redis.quit();
  process.exit(0);
});
