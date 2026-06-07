# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e6]:
    - link "首 页" [ref=e7] [cursor=pointer]:
      - /url: /
      - generic [ref=e8]: 首 页
    - img "SPanel Logo" [ref=e10]
    - link "注 册" [ref=e11] [cursor=pointer]:
      - /url: /auth/register.html
      - generic [ref=e12]: 注 册
  - generic [ref=e14]:
    - generic [ref=e15]: 邮箱
    - textbox "邮箱" [active] [ref=e16]:
      - /placeholder: 请输入邮箱
      - text: test@example.com
  - generic [ref=e18]:
    - generic [ref=e19]: 密码
    - textbox "密码" [ref=e20]:
      - /placeholder: 请输入密码
  - generic [ref=e22]:
    - generic [ref=e23]: 两步验证码（未设置请忽略）
    - textbox "两步验证码（未设置请忽略）" [ref=e24]:
      - /placeholder: 未设置请留空
  - button "确认登录" [ref=e26] [cursor=pointer]
  - generic [ref=e28]:
    - generic [ref=e30] [cursor=pointer]:
      - checkbox "记住我 done" [ref=e31]
      - text: 记住我
      - generic [ref=e33]: done
    - link "忘记密码？" [ref=e34] [cursor=pointer]:
      - /url: /password/reset
  - generic [ref=e36]:
    - generic [ref=e37]: Telegram
    - button "near_me" [ref=e38]:
      - generic [ref=e39]: near_me
    - generic [ref=e40]: 快捷登录（开发中）
```