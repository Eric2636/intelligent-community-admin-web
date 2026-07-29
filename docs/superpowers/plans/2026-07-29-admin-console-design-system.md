# 智慧社区后台统一设计系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有后台管理前端统一为参照 TDesign Pro 的专业企业后台，并重点重做接口监控筛选与数据浏览体验。

**Architecture:** 使用共享页面标题、筛选面板和表格工具栏组件统一页面骨架，由路由元数据驱动全局顶部标题。业务页面保留现有数据请求逻辑，只重组展示层和交互层，避免扩大后端范围。

**Tech Stack:** Vue 3、TypeScript、Ant Design Vue（使用 TDesign 风格设计令牌）、Vue Router、Node.js 内置测试运行器。

---

### Task 1: 建立设计系统回归测试

**Files:**
- Create: `test/admin-design-system.spec.mjs`
- Modify: `test/api-log-pages.spec.mjs`

- [ ] 编写失败测试，要求共享页面组件、路由标题、环境标识、登录正式文案和接口监控有标签筛选结构。
- [ ] 运行 `node --test test/admin-design-system.spec.mjs`，确认因组件和结构尚未实现而失败。

### Task 2: 实现共享页面骨架

**Files:**
- Create: `src/components/admin/PageHeader.vue`
- Create: `src/components/admin/FilterPanel.vue`
- Create: `src/components/admin/TableToolbar.vue`
- Modify: `src/App.vue`
- Modify: `src/router/index.ts`
- Modify: `src/style.css`

- [ ] 实现页面标题、说明、主操作插槽。
- [ ] 实现带更多筛选展开能力的筛选容器。
- [ ] 实现结果总数、最近刷新时间、刷新与扩展操作工具栏。
- [ ] 使用路由元数据在全局顶部栏展示当前页面和环境。
- [ ] 统一卡片、按钮、表格、抽屉、空状态和响应式样式。
- [ ] 运行设计系统测试，确认共享结构通过。

### Task 3: 重做接口监控页面

**Files:**
- Modify: `src/views/ApiAccessLogsView.vue`
- Modify: `test/api-log-pages.spec.mjs`

- [ ] 编写失败测试，要求两个来源页签、固定字段标签、合并状态筛选、更多筛选、表格工具栏和详情抽屉。
- [ ] 将常用筛选固定为接口、请求方法、响应状态和调用时间。
- [ ] 将 IP、操作者和请求耗时移入更多筛选。
- [ ] 将状态类别和精确状态码合并为一个可搜索选择器。
- [ ] 将导出移动到表格工具栏。
- [ ] 增加请求详情抽屉和真实地址复制。
- [ ] 运行日志页面测试并确认通过。

### Task 4: 统一核心列表页面

**Files:**
- Modify: `src/views/UsersView.vue`
- Modify: `src/views/AdminsView.vue`
- Modify: `src/views/ContentView.vue`
- Modify: `src/views/MallCategoriesView.vue`
- Modify: `src/views/MiniModuleEntryView.vue`
- Modify: `src/views/ApiEndpointsView.vue`
- Modify: `src/views/SystemLogsView.vue`
- Modify: `src/views/MiniApiErrorLogsView.vue`

- [ ] 为每个页面增加统一标题和业务说明。
- [ ] 将主操作移动到页面标题区。
- [ ] 将刷新和导出移动到表格工具栏。
- [ ] 统一状态文案和操作结果文案。
- [ ] 为数据表格补充结果数量和刷新时间。
- [ ] 保留现有权限与数据请求行为。

### Task 5: 统一表单和登录体验

**Files:**
- Modify: `src/views/LoginView.vue`
- Modify: `src/views/SystemNoticePublishView.vue`
- Modify: `src/App.vue`

- [ ] 将登录副标题改为正式产品文案。
- [ ] 统一发布通知和修改密码表单的字段提示、校验反馈和按钮文案。
- [ ] 确认回车登录和防重复提交行为不回退。

### Task 6: 完整验证与文档同步

**Files:**
- Modify: `README.md`

- [ ] 运行 `node --test test/*.spec.mjs`。
- [ ] 运行 `npm run build`。
- [ ] 启动本地后台，检查桌面宽度和窄屏下的导航、筛选、表格和抽屉。
- [ ] 在 README 中记录后台页面规范和本地检查路径。
- [ ] 查看 `git diff --check` 和 `git status --short --branch`，确认没有覆盖无关改动。
