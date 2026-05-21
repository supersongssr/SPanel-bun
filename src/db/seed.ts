import { db } from '../config/database';
import { configTable } from './schema';
import { eq } from 'drizzle-orm';

const defaultConfigs = [
  // 基础网站信息
  { name: 'appName', value: 'SPanel-bun 代理中心' },
  { name: 'baseUrl', value: 'http://localhost' },
  { name: 'muKey', value: 'default_highly_secure_mu_key_123456' }, // 默认节点通信密钥
  
  // 用户初始赠送与限制设置
  { name: 'reg_auto_bytes', value: '10737418240' }, // 新注册赠送 10GB 流量 (字节存储)
  { name: 'reg_auto_class', value: '0' },
  { name: 'reg_auto_class_expire', value: '24' }, // 等级默认有效 24 小时
  
  // 签到设置
  { name: 'sign_min_grb', value: '10' }, // 签到最小获取 10MB
  { name: 'sign_max_grb', value: '50' }, // 签到最大获取 50MB
  
  // 安全防护
  { name: 'pow_difficulty', value: '4' }, // 默认 POW 难度前导零个数
  { name: 'redis_rate_limit_enabled', value: '1' },
];

async function seed() {
  console.log('🌱 正在向 MySQL 灌入系统初始化种子配置数据...');
  
  for (const config of defaultConfigs) {
    const exists = await db.select().from(configTable).where(eq(configTable.name, config.name)).limit(1);
    if (exists.length > 0) {
      await db.update(configTable)
        .set({ value: config.value })
        .where(eq(configTable.name, config.name));
    } else {
      await db.insert(configTable)
        .values(config);
    }
  }
  
  console.log('✅ 系统核心 config 种子数据配置导入完毕！');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ 种子数据导入失败：', err);
  process.exit(1);
});
