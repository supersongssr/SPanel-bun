// SPanel-bun Global Unified AJAX Communication Core (M7.1)
// Automates JWT token injection, handles 401 expiration redirects, and shields L7 security challenges.

(function () {
  const API_BASE = '/api/v1';

  window.SPanelAPI = {
    /**
     * 底层统一的 HTTP 请求 Fetch 拦截封装
     */
    async request(endpoint, options = {}) {
      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
      
      // 合并 headers 并自动注入 Bearer JWT Token
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      const token = localStorage.getItem('spanel_jwt');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const fetchOptions = {
        ...options,
        headers,
      };

      try {
        const response = await fetch(url, fetchOptions);
        
        // 强力拦截 401 会话凭证失效错误，瞬间清除过期缓存并强制越权跳转
        if (response.status === 401) {
          localStorage.removeItem('spanel_jwt');
          localStorage.removeItem('spanel_user');
          
          // 如果当前不是在登录页，强制跳转
          if (!window.location.pathname.includes('/auth/')) {
            window.location.replace('/auth/login.html');
          }
          throw new Error('会话过期，请重新登录。');
        }

        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
          return data;
        } else {
          throw new Error(data.message || '网络请求响应异常，请稍后再试。');
        }
      } catch (err) {
        console.error('[API Connection Error]:', err.message);
        throw err;
      }
    },

    /**
     * 自动从后端拉取 POW 挑战，并在 Web Worker 后台计算出 Nonce
     */
    async getPowChallengeAndSolve(captchaId, captchaCode) {
      // 1. 发起图形验证码校验并拉取 POW Salt 挑战
      const challengeResponse = await this.request('/auth/pow-challenge', {
        method: 'POST',
        body: JSON.stringify({ captchaId, captchaCode }),
      });

      const { powSalt, difficulty } = challengeResponse.data;

      // 2. 拉起 Worker 线程异步运算哈希碰撞，避免阻塞浏览器 UI 渲染
      return new Promise((resolve, reject) => {
        const worker = new Worker('/assets/js/pow-worker.js');
        
        worker.postMessage({ salt: powSalt, difficulty });
        
        worker.onmessage = function (e) {
          const res = e.data;
          worker.terminate(); // 计算完成，立即回收 Worker 释放浏览器内存

          if (res.status === 'success') {
            resolve({
              powSalt,
              powNonce: res.nonce,
            });
          } else {
            reject(new Error(res.error || '算力碰撞引擎计算失败。'));
          }
        };

        worker.onerror = function (err) {
          worker.terminate();
          reject(new Error('算力碰撞引擎运行异常：' + err.message));
        };
      });
    }
  };
})();
