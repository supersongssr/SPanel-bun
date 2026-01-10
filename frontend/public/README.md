# SPanel 前端静态资源目录

## 目录说明

本目录用于存放开发时需要直接访问的静态资源文件，这些文件会在构建时自动复制到 `dist/` 目录。

## 目录结构

```
public/
├── admin/           # Admin管理端页面 (开发时占位)
│   └── index.html  # Admin入口HTML
├── user/           # User用户端页面 (开发时占位)
│   ├── index.html  # 首页
│   ├── login.html  # 登录页
│   ├── register.html # 注册页
│   ├── node.html   # 节点页
│   ├── shop.html   # 商店页
│   ├── ticket.html # 工单页
│   └── profile.html # 个人资料页
├── assets/         # 静态资源 (CSS、JS库等)
└── images/         # 图片资源
```

## 注意事项

1. **开发时引用**: 使用绝对路径 `/` 引用public中的文件
2. **构建自动复制**: Vite构建时会自动将public内容复制到dist
3. **最终部署**: 实际部署时使用的是 `frontend/dist/` 目录

## 开发示例

```html
<!-- 在Vue组件中引用public中的图片 -->
<img src="/images/logo.png" alt="Logo">

<!-- 引用public中的静态JS -->
<script src="/assets/lib/jquery.js"></script>
```

## 构建后目录

构建完成后，实际部署目录为 `frontend/dist/`：

```
dist/
├── admin/
│   └── index.html
├── user/
│   ├── index.html
│   ├── login.html
│   └── ...
├── assets/
│   ├── *.js
│   ├── *.css
│   └── *.png
└── index.html
```
