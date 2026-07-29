# 智慧社区企业级后台体验收口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变业务接口和权限模型的前提下，将所有现有后台页面统一为参照 TDesign Pro 的企业级视觉与交互，并完成逐页浏览器验收。

**Architecture:** 保留 Vue 3、Ant Design Vue 和现有请求逻辑，通过全局设计令牌、共享页面组件、统一表格规范和页面级适配完成收口。改造按“全局框架 → 单条件列表 → 配置列表 → 内容列表 → 日志中心 → 状态反馈 → 浏览器验收”推进，每个阶段先写结构回归测试，再修改实现。

**Tech Stack:** Vue 3、TypeScript、Ant Design Vue、Vue Router、Node.js 内置测试运行器、Codex in-app Browser。

**Execution constraint:** 所有改动仅保存在本地 `dev` 分支；未经用户明确要求，不提交、不推送、不合并、不部署。

---

## 文件职责

- `src/App.vue`：后台全局框架、管理员菜单、环境图标入口。
- `src/style.css`：设计令牌映射、页面密度、固定布局、筛选区、表格和状态样式。
- `src/components/admin/EnvironmentIndicator.vue`：本地/测试环境图标及悬浮说明。
- `src/components/admin/PageHeader.vue`：面包屑、单一页面标题、说明和主操作。
- `src/components/admin/FilterPanel.vue`：多条件筛选、更多筛选和操作区。
- `src/components/admin/CompactSearchBar.vue`：单条件搜索页面的紧凑工具栏。
- `src/components/admin/TableToolbar.vue`：结果数、更新时间、刷新、导出和扩展操作。
- `src/views/*.vue`：各业务页面的列宽、状态、操作和详情适配。
- `test/admin-enterprise-polish.spec.mjs`：全局框架和逐页企业级结构回归测试。
- `test/users-page-layout.spec.mjs`：用户页固定布局和明确操作回归。
- `test/api-log-pages.spec.mjs`：日志筛选、详情、地址和参数回归。
- `README.md`：本地验收入口、页面规范和验证命令。

### Task 1: 固化企业级页面验收基线

**Files:**
- Create: `test/admin-enterprise-polish.spec.mjs`
- Modify: `test/users-page-layout.spec.mjs`
- Modify: `test/api-log-pages.spec.mjs`

- [ ] **Step 1: 编写失败测试，覆盖环境图标、紧凑搜索和全页面表格规范**

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

test('环境信息以图标和悬浮说明显示在管理员账号附近', async () => {
  const app = await source('src/App.vue');
  const indicator = await source('src/components/admin/EnvironmentIndicator.vue');
  assert.match(app, /<EnvironmentIndicator/);
  assert.match(app, /class="header-actions"/);
  assert.match(indicator, /a-tooltip/);
  assert.match(indicator, /本地开发环境/);
  assert.match(indicator, /测试环境/);
  assert.doesNotMatch(app, /\{\{\s*environmentLabel\s*\}\}/);
});

test('单条件搜索页面统一使用紧凑搜索工具栏', async () => {
  for (const name of ['UsersView.vue', 'AdminsView.vue']) {
    const view = await source(`src/views/${name}`);
    assert.match(view, /<CompactSearchBar/);
    assert.doesNotMatch(view, /toolbar--filters/);
  }
});

test('包含选择条件的页面使用带标签的筛选面板', async () => {
  for (const name of ['ContentView.vue', 'SystemLogsView.vue', 'MiniApiErrorLogsView.vue']) {
    assert.match(await source(`src/views/${name}`), /<FilterPanel/);
  }
});
```

- [ ] **Step 2: 运行测试并确认因共享组件尚未创建而失败**

Run: `node --test test/admin-enterprise-polish.spec.mjs`

Expected: FAIL，错误包含 `EnvironmentIndicator.vue` 或 `<CompactSearchBar` 未找到。

- [ ] **Step 3: 将现有页面清单写入测试，防止漏验**

```js
const enterprisePages = [
  'UsersView.vue',
  'AdminsView.vue',
  'MiniModuleEntryView.vue',
  'MallCategoriesView.vue',
  'SystemNoticePublishView.vue',
  'ApiEndpointsView.vue',
  'SystemLogsView.vue',
  'ApiAccessLogsView.vue',
  'MiniApiErrorLogsView.vue',
  'ContentView.vue',
];

test('所有后台业务页面均使用统一页面标题', async () => {
  for (const name of enterprisePages) {
    assert.match(await source(`src/views/${name}`), /<PageHeader/);
  }
});
```

- [ ] **Step 4: 再次运行测试，确认失败原因来自未完成的企业级结构**

Run: `node --test test/admin-enterprise-polish.spec.mjs`

Expected: FAIL，且不是语法错误或文件路径错误。

### Task 2: 完成全局框架和环境图标

**Files:**
- Create: `src/components/admin/EnvironmentIndicator.vue`
- Modify: `src/App.vue`
- Modify: `src/style.css`
- Test: `test/admin-enterprise-polish.spec.mjs`

- [ ] **Step 1: 实现环境图标组件**

```vue
<template>
  <a-tooltip v-if="mode !== 'production'" :title="tooltip">
    <span class="environment-indicator" :class="`environment-indicator--${mode}`" :aria-label="tooltip">
      <CodeOutlined v-if="mode === 'local'" />
      <ExperimentOutlined v-else />
    </span>
  </a-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CodeOutlined, ExperimentOutlined } from '@ant-design/icons-vue';

const mode = import.meta.env.PROD ? 'production' : import.meta.env.MODE === 'test' ? 'test' : 'local';
const tooltip = computed(() => (mode === 'test' ? '测试环境' : '本地开发环境'));
</script>
```

- [ ] **Step 2: 将图标移动到管理员账号左侧并删除顶部左侧文本**

```vue
<div class="header-actions">
  <EnvironmentIndicator />
  <a-dropdown placement="bottomRight" trigger="click">
    <!-- 保留现有管理员账号按钮 -->
  </a-dropdown>
</div>
```

- [ ] **Step 3: 固化顶部栏和侧栏尺寸**

```css
.ant-layout-header.header {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 56px !important;
}

.ant-layout-sider.app-sider {
  position: sticky !important;
  top: 0;
  height: 100vh !important;
}

.environment-indicator {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
```

- [ ] **Step 4: 运行框架测试**

Run: `node --test test/admin-enterprise-polish.spec.mjs test/users-page-layout.spec.mjs`

Expected: 环境图标、顶部栏、侧栏相关测试 PASS。

### Task 3: 统一单条件搜索页面

**Files:**
- Create: `src/components/admin/CompactSearchBar.vue`
- Modify: `src/views/UsersView.vue`
- Modify: `src/views/AdminsView.vue`
- Modify: `src/style.css`
- Test: `test/admin-enterprise-polish.spec.mjs`
- Test: `test/enter-actions.spec.mjs`

- [ ] **Step 1: 创建紧凑搜索组件**

```vue
<template>
  <div class="toolbar compact-search-bar">
    <a-input-search
      :value="modelValue"
      :placeholder="placeholder"
      allow-clear
      @update:value="$emit('update:modelValue', $event)"
      @search="$emit('search')"
    />
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ modelValue: string; placeholder?: string }>(), {
  placeholder: '请输入关键词',
});
defineEmits<{ 'update:modelValue': [value: string]; search: [] }>();
</script>
```

- [ ] **Step 2: 逐页替换大面积灰色搜索容器**

```vue
<CompactSearchBar
  v-model="keyword"
  placeholder="搜索昵称或 OpenID"
  @search="submitSearch"
/>
```

两个页面保留原有 `submitSearch()`：先设置 `pagination.current = 1`，再调用 `load(true)`。

- [ ] **Step 3: 统一紧凑工具栏尺寸**

```css
.compact-search-bar {
  min-height: 48px;
  margin: 0;
  padding-bottom: 16px;
  border-bottom: 1px solid #f2f3f5;
}

.compact-search-bar .ant-input-group-wrapper {
  width: 320px;
  max-width: 100%;
}
```

- [ ] **Step 4: 运行搜索交互测试**

Run: `node --test test/admin-enterprise-polish.spec.mjs test/enter-actions.spec.mjs`

Expected: 单条件页面结构和回车查询测试 PASS。

### Task 4: 统一配置型列表与危险操作

**Files:**
- Modify: `src/views/AdminsView.vue`
- Modify: `src/views/MiniModuleEntryView.vue`
- Modify: `src/views/MallCategoriesView.vue`
- Modify: `src/views/ApiEndpointsView.vue`
- Modify: `src/style.css`
- Test: `test/admin-enterprise-polish.spec.mjs`

- [ ] **Step 1: 编写失败测试，禁止列表中使用含义不明的状态开关**

```js
test('状态列与操作列分离，危险操作使用明确文案', async () => {
  const users = await source('src/views/UsersView.vue');
  assert.doesNotMatch(users, /<a-switch/);
  assert.match(users, /冻结/);
  assert.match(users, /解冻/);

  const admins = await source('src/views/AdminsView.vue');
  assert.match(admins, /停用/);
  assert.match(admins, /启用/);
});
```

- [ ] **Step 2: 将用户和管理员账号状态改为标签加文字操作**

```vue
<a-tag :color="record.enabled ? 'green' : 'red'">
  {{ record.enabled ? '正常' : '已停用' }}
</a-tag>
<a-button type="link" size="small" :danger="record.enabled" @click="confirmStatusChange(record)">
  {{ record.enabled ? '停用' : '启用' }}
</a-button>
```

- [ ] **Step 3: 保留真正适合即时开关的配置项，但增加状态回滚**

模块入口、市场分类和接口日志记录属于配置开关，可以保留 `a-switch`；切换前保存旧值，请求失败时恢复：

```ts
const previous = record.enabled;
record.enabled = enabled;
try {
  await updateEnabled(record.id, enabled);
} catch (error) {
  record.enabled = previous;
  message.error(errorMessage(error));
}
```

- [ ] **Step 4: 统一表格列宽、空值和固定操作列**

```ts
const columns = [
  { title: '名称', dataIndex: 'name', ellipsis: true, width: 220 },
  { title: '状态', key: 'status', width: 100 },
  { title: '更新时间', dataIndex: 'updatedAt', width: 180 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' as const },
];
```

- [ ] **Step 5: 运行配置页面回归测试**

Run: `node --test test/admin-enterprise-polish.spec.mjs`

Expected: 状态语义、危险操作和配置开关回滚测试 PASS。

### Task 5: 统一内容管理列表

**Files:**
- Modify: `src/views/ContentView.vue`
- Modify: `src/components/admin/FilterPanel.vue`
- Modify: `src/style.css`
- Test: `test/admin-enterprise-polish.spec.mjs`
- Test: `test/task-status-edit-guard.spec.mjs`

- [ ] **Step 1: 编写失败测试，覆盖三个内容模块的操作语义**

```js
test('内容模块显示明确的上架、下架、置顶和删除操作', async () => {
  const view = await source('src/views/ContentView.vue');
  assert.match(view, /上架/);
  assert.match(view, /下架/);
  assert.match(view, /置顶/);
  assert.match(view, /取消置顶/);
  assert.match(view, /删除/);
});
```

- [ ] **Step 2: 将列表开关改为状态标签和文字操作**

```vue
<a-tag :color="record.enabled ? 'green' : 'default'">
  {{ record.enabled ? '已上架' : '已下架' }}
</a-tag>
<a-button type="link" size="small" @click="toggleEnabled(record)">
  {{ record.enabled ? '下架' : '上架' }}
</a-button>
```

编辑弹窗中的布尔字段仍使用开关，因为其含义由表单标签明确限定。

- [ ] **Step 3: 将关键词和上架状态放入带标签的筛选面板**

```vue
<FilterPanel>
  <label class="filter-field filter-field--wide">
    <span class="filter-field__label">关键词</span>
    <a-input v-model:value="keyword" :placeholder="`搜索${title}`" @pressEnter="submitSearch" />
  </label>
  <label class="filter-field">
    <span class="filter-field__label">上架状态</span>
    <a-select v-model:value="visibility" placeholder="全部状态">
      <a-select-option value="">全部状态</a-select-option>
      <a-select-option value="ONLINE">已上架</a-select-option>
      <a-select-option value="OFFLINE">已下架</a-select-option>
    </a-select>
  </label>
  <template #actions>
    <a-button type="primary" @click="submitSearch">查询</a-button>
    <a-button @click="resetSearch">重置</a-button>
  </template>
</FilterPanel>
```

- [ ] **Step 4: 统一内容列宽和长文本展示**

正文列设置合理最大宽度并省略；作者、状态、发布时间和操作保持可见；操作列固定右侧。

```vue
<a-tooltip :title="record.content">
  <span class="table-cell-ellipsis">{{ record.content || '—' }}</span>
</a-tooltip>
```

- [ ] **Step 5: 为删除、下架和置顶操作补充对象名称及影响说明**

```ts
Modal.confirm({
  title: `确认删除“${record.title || record.name || '该内容'}”？`,
  content: '删除后列表中将不再展示，该操作会记录到操作审计。',
  okText: '删除',
  okButtonProps: { danger: true },
  onOk: () => removeContent(record.id),
});
```

- [ ] **Step 6: 运行内容模块测试**

Run: `node --test test/admin-enterprise-polish.spec.mjs test/task-status-edit-guard.spec.mjs`

Expected: 内容操作语义测试和任务状态保护测试 PASS。

### Task 6: 收口日志中心布局和详情

**Files:**
- Modify: `src/views/SystemLogsView.vue`
- Modify: `src/views/ApiAccessLogsView.vue`
- Modify: `src/views/MiniApiErrorLogsView.vue`
- Modify: `src/views/ApiErrorLogsView.vue`
- Modify: `src/components/admin/FilterPanel.vue`
- Modify: `src/style.css`
- Test: `test/api-log-pages.spec.mjs`
- Test: `test/admin-enterprise-polish.spec.mjs`

- [ ] **Step 1: 编写失败测试，覆盖日志表格关键列和详情字段**

```js
test('接口监控列表直接显示完整请求地址并在详情展示参数', async () => {
  const view = await source('src/views/ApiAccessLogsView.vue');
  assert.match(view, /title:\s*'请求地址'/);
  assert.match(view, /请求参数/);
  assert.match(view, /复制地址/);
});
```

- [ ] **Step 2: 调整接口监控列优先级**

列表保留调用时间、来源、方法、请求地址、状态、耗时和操作；IP、操作者、业务码、参数和响应摘要进入详情抽屉。请求地址列使用等宽字体、省略和悬浮提示。

- [ ] **Step 3: 统一多条件筛选**

常用筛选固定为接口、方法、响应状态和调用时间；IP、操作者和耗时放入“更多筛选”；耗时只使用预设区间和一个自定义入口。

- [ ] **Step 4: 操作审计突出业务对象和中文动作**

列表展示时间、管理员、模块、中文动作、业务对象、结果和操作；完整请求地址、参数、修改前后数据放入详情抽屉并分别提供复制操作。

- [ ] **Step 5: 操作审计和异常上报使用带标签的筛选面板**

操作审计常用条件为关键词和动作；异常上报常用条件为关键词、请求方法和状态码。选择条件不自动查询，由“查询”统一触发；状态码继续支持回车查询。

- [ ] **Step 6: 小程序异常上报统一状态筛选和详情**

错误摘要在列表单行省略，完整堆栈、页面路由、设备信息、用户、请求地址和上报参数放入详情抽屉。

- [ ] **Step 7: 运行日志回归测试**

Run: `node --test test/api-log-pages.spec.mjs test/admin-enterprise-polish.spec.mjs`

Expected: 日志筛选、真实地址、错误参数、详情字段和复制操作测试 PASS。

### Task 7: 统一加载、空数据、错误和无权限状态

**Files:**
- Modify: `src/components/admin/TableToolbar.vue`
- Modify: `src/style.css`
- Modify: `src/views/UsersView.vue`
- Modify: `src/views/AdminsView.vue`
- Modify: `src/views/ContentView.vue`
- Modify: `src/views/ApiAccessLogsView.vue`
- Modify: `src/views/SystemLogsView.vue`
- Modify: `src/views/MiniApiErrorLogsView.vue`
- Test: `test/admin-enterprise-polish.spec.mjs`

- [ ] **Step 1: 编写失败测试，要求错误后清理旧列表并显示重试入口**

```js
test('列表请求失败不继续展示旧数据', async () => {
  for (const name of ['UsersView.vue', 'AdminsView.vue', 'ContentView.vue']) {
    const view = await source(`src/views/${name}`);
    assert.match(view, /rows\.value\s*=\s*\[\]/);
    assert.match(view, /loadError/);
  }
});
```

- [ ] **Step 2: 在请求失败时清理旧数据并记录错误**

```ts
const loadError = ref('');

onSuccess: (data) => {
  loadError.value = '';
  rows.value = data.list;
},
onError: (error) => {
  rows.value = [];
  pagination.total = 0;
  loadError.value = errorMessage(error);
},
```

- [ ] **Step 3: 在表格上方显示可重试错误提示**

```vue
<a-alert v-if="loadError" type="error" show-icon :message="loadError">
  <template #action>
    <a-button size="small" @click="load()">重新加载</a-button>
  </template>
</a-alert>
```

- [ ] **Step 4: 区分无数据和筛选无结果**

```vue
<a-empty :description="keyword || hasFilters ? '当前筛选无结果' : '暂无数据'" />
```

- [ ] **Step 5: 运行完整前端测试**

Run: `node --test test/*.spec.mjs`

Expected: 所有测试 PASS，失败数为 0。

### Task 8: 浏览器逐页验收和文档同步

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-07-29-admin-console-design-system.md`
- Modify: `docs/superpowers/plans/2026-07-29-enterprise-admin-console-polish.md`

- [ ] **Step 1: 运行构建和静态检查**

Run: `npm run build`

Expected: exit code 0；允许保留已有的大包体积 warning，不允许出现 TypeScript 或构建错误。

Run: `git diff --check`

Expected: exit code 0，无空白错误。

- [ ] **Step 2: 在 1440×900 下逐页检查**

依次打开：用户管理、管理员管理、小程序模块开关、市场分类、系统通知、接口日志设置、操作审计、接口监控、小程序异常上报、小区留言、小区市场、业主互助。

每页检查：标题层级、筛选留白、列宽、固定操作列、分页、加载状态、详情弹窗或抽屉。

- [ ] **Step 3: 在 1920×1080 下重复检查**

确认宽屏下内容不会过度拉伸；请求地址和正文列保持可读宽度；按钮不远离其业务对象。

- [ ] **Step 4: 验证长页面滚动**

对用户管理、内容管理、操作审计和接口监控滚动到页面底部，确认：

```text
顶部栏高度 = 56px
侧栏高度 = 浏览器视口高度
收起菜单位于侧栏底部
表头保持可见
操作列不被遮挡
```

- [ ] **Step 5: 更新 README 验收说明**

```markdown
## 后台界面本地验收

1. 启动本地后台并访问 `http://127.0.0.1:5174/`。
2. 使用 1440×900 和 1920×1080 检查所有菜单页面。
3. 本地和测试环境通过管理员账号旁的图标识别，悬浮可查看环境名称。
4. 列表接口失败时必须清空旧结果并显示重新加载入口。
```

- [ ] **Step 6: 最终验证**

Run: `node --test test/*.spec.mjs && npm run build && git diff --check`

Expected: 测试失败数 0、构建 exit code 0、diff check exit code 0。

- [ ] **Step 7: 报告本地改动状态**

Run: `git status --short --branch`

Expected: 当前分支为 `dev`；列出本轮修改文件。不执行 `git add`、`git commit`、`git push` 或部署命令。
