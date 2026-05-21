import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { loadConfig } from './config/app';
import { ipDerive, ipBlockGuard } from './middleware/ip';
import { authDerive } from './middleware/auth';
import { authController } from './controllers/auth';

// 启动前数据库与动态配置预载入
await loadConfig();

const app = new Elysia()
  // 1. 全局跨域共享 (CORS) 与 API 自我文档 (Swagger UI) 挂载
  .use(cors())
  .use(swagger({
    path: '/swagger',
    documentation: {
      info: {
        title: 'SPanel-bun RESTful API',
        version: '1.0.0',
        description: 'Premium VPN & Proxy Panel API documentation powered by ElysiaJS & Bun',
      },
    },
  }))

  // 2. 真实 IP 与 JWT 会话全局拦截派生
  .derive(ipDerive)
  .derive(authDerive)
  
  // 3. 安全前置防御 (IP 封禁与防御层)
  .onBeforeHandle(ipBlockGuard)

  // 4. 全局 BigInt 递归序列化为 String 的拦截器 (防精度溢出与 JSON 崩溃)
  .mapResponse(({ response }: { response: any }) => {
    if (response instanceof Response) return response;
    
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') return obj.toString();
      if (Array.isArray(obj)) return obj.map(serializeBigInt);
      if (typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
          newObj[key] = serializeBigInt(obj[key]);
        }
        return newObj;
      }
      return obj;
    };

    return new Response(JSON.stringify(serializeBigInt(response)), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  })

  // 5. 错误捕获控制域 (统一返回简体中文错误提示)
  .onError(({ error, code, set }: { error: any; code: any; set: any }) => {
    console.error(`[API Error] Code: ${code} | Message:`, error.message);
    
    set.headers['Content-Type'] = 'application/json; charset=utf-8';
    
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return { status: 'error', message: '请求的 API 路由端点不存在，请检查请求路径。' };
    }
    
    if (code === 'VALIDATION') {
      set.status = 422;
      return { status: 'error', message: '提交的表单参数校验失败，请检查字段格式。', details: error.message };
    }

    set.status = set.status === 200 ? 500 : set.status;
    return {
      status: 'error',
      message: error.message || '服务器内部运行异常，请稍后再试或联系系统管理员。',
    };
  })

  // 6. 挂载游客与鉴权控制器接口
  .use(authController)

  // 7. 系统运行健康检查端点 (Web Entry Health Check)
  .get('/api/health', () => {
    return {
      status: 'success',
      service: 'SPanel-bun Server',
      timestamp: Date.now(),
      timezone: 'Asia/Shanghai',
    };
  })

  // 7. 启动服务监听 (默认使用 3000 端口，可通过 PORT 环境变量动态重写)
  .listen(process.env.PORT || 3000);

console.log(`🚀 SPanel-bun running at http://${app.server?.hostname}:${app.server?.port}`);
console.log(`📖 Swagger API Document is accessible at http://${app.server?.hostname}:${app.server?.port}/swagger`);

export { app };
