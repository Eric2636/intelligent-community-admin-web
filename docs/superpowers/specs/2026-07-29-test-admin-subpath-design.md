# 测试后台子路径发布设计

## 目标

让线上测试环境后台通过以下 HTTPS 地址访问：

```text
https://lllhjh.asia/test-admin/
```

测试后台的所有管理接口必须继续访问 `ic-test-admin-api`，不得访问生产 API。生产后台 `https://lllhjh.asia/` 的路由、静态资源和接口行为保持不变。

## 现状与根因

- `ic-test-admin-web` 和 `ic-test-admin-api` 容器运行正常。
- 服务器本机访问测试后台首页和 `/api/health` 均正常。
- 测试后台只映射到服务器端口 `3001`，该端口未在公网入口开放。
- HTTPS 网关目前只代理生产后台、生产 API 和 `/test-api/`，没有测试后台入口。
- `test.lllhjh.asia` 没有有效 DNS 记录，现有证书也不包含该子域名。

## 方案

### 前端子路径支持

后台前端增加构建期基础路径配置：

- 默认基础路径为 `/`，供本地开发和生产后台使用。
- 测试构建使用 `/test-admin/`。
- Vite 静态资源基础路径、Vue Router history 基础路径和登录失效后的跳转路径使用同一个基础路径。
- Axios 的基础地址使用应用基础路径，使测试构建中的 `/api/...` 请求实际发往 `/test-admin/api/...`。

Docker 构建增加可选的 `VITE_APP_BASE` 构建参数。生产构建不传参数，行为保持不变；测试构建传入 `/test-admin/`。

### 网关转发

现有 HTTPS 网关增加测试后台 upstream，并新增两条规则：

- `/test-admin` 重定向到 `/test-admin/`。
- `/test-admin/` 转发到 `ic-test-admin-web:80`，转发时去掉 `/test-admin/` 前缀。

测试后台容器内部继续把 `/api/` 转发到 `api-test:3000`。因此数据流为：

```text
浏览器 /test-admin/api/...
  -> HTTPS 网关
  -> ic-test-admin-web /api/...
  -> ic-test-admin-api
```

生产流量不经过这条规则。

## 发布流程

1. 在 `dev` 分支实现并验证子路径支持。
2. 将批准的改动合入 `test` 分支。
3. 使用 `VITE_APP_BASE=/test-admin/` 构建测试后台镜像并重建 `ic-test-admin-web`。
4. 更新服务器网关配置，先执行配置检查，再平滑重载。
5. 不开放公网 `3001` 端口。

## 验证

- 自动测试验证基础路径、路由基础路径、API 基础地址和 Docker 构建参数。
- 本地分别执行默认构建和 `/test-admin/` 测试构建。
- 验证 `https://lllhjh.asia/test-admin/` 返回后台页面。
- 验证静态资源均从 `/test-admin/` 加载。
- 验证 `https://lllhjh.asia/test-admin/api/health` 返回测试 API 健康结果。
- 登录后验证至少一个只读管理接口，确认数据来自测试环境。
- 验证 `https://lllhjh.asia/` 和 `https://lllhjh.asia/api/health` 仍正常。

## 回滚

- 恢复网关配置备份并平滑重载。
- 使用上一版测试后台镜像重建 `ic-test-admin-web`。
- 回滚只影响 `/test-admin/`，生产后台与生产 API 不需要停机。
