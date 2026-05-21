// SPanel-bun Anti-Flicker Front-End Navigation Guard Shield (M7.2)
// Synchronously blocks unauthorized rendering to guarantee zero content jitter (flickering).

(function () {
  const token = localStorage.getItem('spanel_jwt');
  const userStr = localStorage.getItem('spanel_user');
  let user = null;
  
  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    localStorage.removeItem('spanel_jwt');
    localStorage.removeItem('spanel_user');
  }

  const path = window.location.pathname;

  // 1. 普通会员中心页面越权前置拦截
  if (path.includes('/user/')) {
    if (!token) {
      // 瞬间隐藏浏览器文档节点，直接触发物理跳转，防止内容泄露与渲染闪烁
      document.documentElement.style.display = 'none';
      window.location.replace('/auth/login.html');
      return;
    }
  }

  // 2. 超级管理员中心高特权页面越权前置拦截
  if (path.includes('/admin/')) {
    if (!token || !user || !user.isAdmin) {
      document.documentElement.style.display = 'none';
      window.location.replace('/auth/login.html');
      return;
    }
  }

  // 3. 已具备有效会话的用户进入登录/注册页时，执行正向业务分流重定向
  if (path.includes('/auth/')) {
    if (token && user) {
      document.documentElement.style.display = 'none';
      if (user.isAdmin) {
        window.location.replace('/admin/dashboard.html');
      } else {
        window.location.replace('/user/dashboard.html');
      }
    }
  }
})();
