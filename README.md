# 智慧社区后台管理系统

基于 Vue 3、Vite、TypeScript 和 Ant Design Vue 的智慧社区后台管理前端。

## 开发

```bash
npm install
npm run dev
```

开发环境下，Vite 会把 `/api` 代理到 `http://127.0.0.1:3000`。

## 构建

```bash
npm run build
```

## Docker 部署

```bash
docker build -t ic-admin-web:latest .
docker run -d --name ic-admin-web --restart unless-stopped -p 8089:80 ic-admin-web:latest
```

容器内 Nginx 会托管前端静态文件，并把 `/api/` 反代到 `ic-admin-api:3000`。
