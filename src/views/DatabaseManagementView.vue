<template>
  <div class="admin-page">
    <PageHeader title="数据库管理" description="管理当前环境的备份计划，并只读查看数据表结构。" :breadcrumbs="['系统运维', '数据库管理']" />

    <div class="database-card">
      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="backup" tab="备份管理">
          <a-alert v-if="settingError || overviewError" type="error" show-icon class="page-alert">
            <template #message>部分备份状态加载失败</template>
            <template #description>{{ settingError || overviewError }}</template>
            <template #action><a-button size="small" @click="reloadBackupSummary">重试</a-button></template>
          </a-alert>

          <div class="status-grid">
            <a-card size="small" class="status-card" :loading="loadingSetting">
              <a-statistic title="自动备份" :value="settingLoaded ? (setting.enabled ? '已启用' : '已停用') : '--'" />
              <div class="status-card__hint">{{ settingLoaded ? scheduleDescription : '设置加载后显示' }}</div>
            </a-card>
            <a-card size="small" class="status-card" :loading="loadingOverview">
              <a-statistic title="最近成功备份" :value="overview ? backupTime(overview.latestSuccess) : '--'" />
              <div class="status-card__hint">{{ overview?.latestSuccess?.outputFileName || (overview ? '尚无成功记录' : '状态加载后显示') }}</div>
            </a-card>
            <a-card size="small" class="status-card" :loading="loadingOverview">
              <a-statistic title="当前任务" :value="overview ? activeJobText : '--'" />
              <div class="status-card__hint">{{ overview?.activeJob ? `计划于 ${formatDateTimeYmdHm(overview.activeJob.scheduledAt)}` : (overview ? '当前没有等待或执行中的任务' : '状态加载后显示') }}</div>
            </a-card>
          </div>

          <section class="section-block">
            <div class="section-heading">
              <div><h2>自动备份设置</h2><p>仅保留当前环境最新一份有效备份；新备份完整校验成功后才覆盖旧文件。</p></div>
              <a-button type="primary" :disabled="!settingLoaded" :loading="savingSetting" @click="saveSetting">保存设置</a-button>
            </div>
            <a-form layout="vertical" class="setting-form">
              <a-form-item label="自动备份"><a-switch v-model:checked="setting.enabled" :disabled="!settingLoaded" checked-children="开启" un-checked-children="关闭" /></a-form-item>
              <a-form-item label="备份频率">
                <a-select v-model:value="setting.frequency" :disabled="!settingLoaded || !setting.enabled">
                  <a-select-option value="HOURLY">每小时</a-select-option><a-select-option value="EVERY_6_HOURS">每 6 小时</a-select-option><a-select-option value="DAILY">每天</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item v-if="setting.frequency === 'DAILY'" label="执行小时"><a-input-number v-model:value="setting.dailyHour" :min="0" :max="23" :disabled="!settingLoaded || !setting.enabled" /></a-form-item>
              <a-form-item label="执行分钟"><a-input-number v-model:value="setting.minute" :min="0" :max="59" :disabled="!settingLoaded || !setting.enabled" /></a-form-item>
            </a-form>
          </section>

          <section class="section-block">
            <div class="section-heading">
              <div><h2>备份记录</h2><p>展示计划、执行、结束、耗时和发起人，便于定位备份任务全过程。</p></div>
              <a-space><a-button :loading="loadingJobs" @click="loadJobs"><ReloadOutlined />刷新</a-button><a-button type="primary" :disabled="Boolean(overview?.activeJob)" :loading="creatingBackup" @click="confirmManualBackup"><CloudDownloadOutlined />手动备份</a-button></a-space>
            </div>
            <a-alert v-if="jobsError" type="error" show-icon :message="jobsError" class="section-alert"><template #action><a-button size="small" @click="loadJobs">重试</a-button></template></a-alert>
            <a-table row-key="id" :columns="jobColumns" :data-source="jobs" :loading="loadingJobs" :pagination="jobPagination" :scroll="{ x: 1480 }" @change="onJobTableChange">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'triggerType'">{{ record.triggerType === 'AUTO' ? '自动' : '手动' }}</template>
                <template v-else-if="column.key === 'status'"><a-tag :color="statusColor(record.status)">{{ statusText(record.status) }}</a-tag></template>
                <template v-else-if="column.key === 'size'">{{ formatBytes(record.outputSizeBytes) }}</template>
                <template v-else-if="['scheduledAt', 'startedAt', 'finishedAt'].includes(String(column.key))">{{ formatOptionalTime(record[column.key]) }}</template>
                <template v-else-if="column.key === 'durationMs'">{{ formatDuration(record.durationMs) }}</template>
                <template v-else-if="column.key === 'requestedBy'">{{ record.triggerType === 'AUTO' ? '系统' : (record.requestedByAdminUsername || record.requestedByAdminId || '—') }}</template>
                <template v-else-if="column.key === 'errorMessage'"><a-tooltip v-if="record.errorMessage" :title="record.errorMessage"><span class="error-text">{{ record.errorMessage }}</span></a-tooltip><span v-else>—</span></template>
              </template>
            </a-table>
          </section>
        </a-tab-pane>

        <a-tab-pane key="tables" tab="数据表">
          <div class="section-heading table-heading">
            <div><h2>数据表结构</h2><p>仅展示表、字段和索引定义，不读取业务记录，也不提供 SQL、恢复或下载操作。</p></div>
            <a-button :loading="loadingTables" @click="loadTables"><ReloadOutlined />刷新</a-button>
          </div>
          <div class="table-toolbar">
            <a-input v-model:value="tableKeyword" allow-clear placeholder="搜索表名、所属模块或用途说明" @pressEnter="loadTables">
              <template #suffix><a-tooltip title="查询"><SearchOutlined class="search-icon" @click="loadTables" /></a-tooltip></template>
            </a-input>
          </div>
          <a-alert v-if="tablesError" type="error" show-icon :message="tablesError" class="section-alert"><template #action><a-button size="small" @click="loadTables">重试</a-button></template></a-alert>
          <a-table row-key="tableName" :loading="loadingTables" :columns="tableColumns" :data-source="tables" :pagination="false">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'size'">{{ formatBytes(record.dataBytes + record.indexBytes) }}</template>
              <template v-else-if="column.key === 'actions'"><a-tooltip title="查看字段与索引"><a-button type="text" aria-label="查看字段与索引" @click="openStructure(record.tableName)"><EyeOutlined /></a-button></a-tooltip></template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </div>

    <a-drawer v-model:open="structureOpen" title="表结构详情" width="840" destroy-on-close>
      <a-spin :spinning="loadingStructure">
        <template v-if="structure">
          <a-descriptions size="small" :column="1" bordered class="structure-summary"><a-descriptions-item label="数据表">{{ structure.tableName }}</a-descriptions-item><a-descriptions-item label="所属模块">{{ structure.module }}</a-descriptions-item><a-descriptions-item label="用途">{{ structure.description }}</a-descriptions-item></a-descriptions>
              <h3 class="drawer-heading">字段结构</h3>
          <a-table size="small" row-key="columnName" :columns="columnColumns" :data-source="structure.columns" :pagination="false" :scroll="{ x: 760 }" />
          <h3 class="drawer-heading">索引定义</h3>
          <a-table size="small" :row-key="indexRowKey" :columns="indexColumns" :data-source="structure.indexes" :pagination="false" />
        </template>
      </a-spin>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { CloudDownloadOutlined, EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue';
import { Modal, message } from 'ant-design-vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import PageHeader from '../components/admin/PageHeader.vue';
import { createDatabaseBackup, errorMessage, getDatabaseBackupOverview, getDatabaseBackupSetting, getDatabaseTableStructure, listDatabaseBackupJobs, listDatabaseTables, updateDatabaseBackupSetting } from '../api/admin';
import type { BackupFrequency, BackupJobStatus, DatabaseBackupJob, DatabaseBackupOverview, DatabaseIndexInfo, DatabaseTableInfo, DatabaseTableStructure } from '../types/api';
import { formatDateTimeYmdHm } from '../utils/date';

const activeTab = ref('backup');
const savingSetting = ref(false), creatingBackup = ref(false), loadingSetting = ref(false), loadingOverview = ref(false), loadingJobs = ref(false), loadingTables = ref(false), loadingStructure = ref(false);
const settingLoaded = ref(false), settingError = ref(''), overviewError = ref(''), jobsError = ref(''), tablesError = ref('');
const jobs = ref<DatabaseBackupJob[]>([]), tables = ref<DatabaseTableInfo[]>([]), structure = ref<DatabaseTableStructure | null>(null), overview = ref<DatabaseBackupOverview | null>(null);
const structureOpen = ref(false), tableKeyword = ref('');
const setting = reactive({ enabled: true, frequency: 'HOURLY' as BackupFrequency, minute: 5, dailyHour: 2 });
const jobPagination = reactive({ current: 1, pageSize: 20, total: 0, showSizeChanger: true });

const jobColumns = [
  { title: '触发', key: 'triggerType', width: 80, fixed: 'left' as const }, { title: '状态', key: 'status', width: 90 }, { title: '环境', dataIndex: 'environment', key: 'environment', width: 100 },
  { title: '计划时间', key: 'scheduledAt', width: 160 }, { title: '开始时间', key: 'startedAt', width: 160 }, { title: '结束时间', key: 'finishedAt', width: 160 }, { title: '耗时', key: 'durationMs', width: 100 },
  { title: '发起人', key: 'requestedBy', width: 130 }, { title: '备份文件', dataIndex: 'outputFileName', key: 'outputFileName', width: 220, ellipsis: true }, { title: '大小', key: 'size', width: 100 }, { title: '失败原因', key: 'errorMessage', width: 240 },
];
const tableColumns = [{ title: '数据表', dataIndex: 'tableName', key: 'tableName', width: 240 }, { title: '所属模块', dataIndex: 'module', key: 'module', width: 150 }, { title: '用途说明', dataIndex: 'description', key: 'description' }, { title: '估算行数', dataIndex: 'rowCount', key: 'rowCount', width: 120 }, { title: '占用空间', key: 'size', width: 120 }, { title: '操作', key: 'actions', width: 80, align: 'center' as const }];
const columnColumns = [{ title: '字段', dataIndex: 'columnName', key: 'columnName', width: 170 }, { title: '类型', dataIndex: 'columnType', key: 'columnType', width: 190 }, { title: '允许空', dataIndex: 'nullable', key: 'nullable', width: 90 }, { title: '默认值', dataIndex: 'defaultValue', key: 'defaultValue', width: 130 }, { title: '索引标记', dataIndex: 'columnKey', key: 'columnKey', width: 90 }, { title: '说明', dataIndex: 'comment', key: 'comment', width: 180 }];
const indexColumns = [{ title: '索引名', dataIndex: 'indexName', key: 'indexName' }, { title: '字段', dataIndex: 'columnName', key: 'columnName' }, { title: '顺序', dataIndex: 'seqInIndex', key: 'seqInIndex', width: 80 }, { title: '唯一', key: 'unique', width: 80, customRender: ({ record }: any) => record.nonUnique ? '否' : '是' }, { title: '类型', dataIndex: 'indexType', key: 'indexType', width: 100 }];

const scheduleDescription = computed(() => { if (!setting.enabled) return '自动备份当前处于关闭状态'; if (setting.frequency === 'HOURLY') return `每小时第 ${setting.minute} 分钟执行`; if (setting.frequency === 'EVERY_6_HOURS') return `每 6 小时的第 ${setting.minute} 分钟执行`; return `每天 ${String(setting.dailyHour).padStart(2, '0')}:${String(setting.minute).padStart(2, '0')} 执行`; });
const activeJobText = computed(() => overview.value?.activeJob ? statusText(overview.value.activeJob.status) : '无执行中任务');
function backupTime(job: DatabaseBackupJob | null) { return job ? formatDateTimeYmdHm(job.finishedAt || job.createdAt) : '暂无记录'; }
function formatBytes(value?: string | number | null) { const bytes = Number(value || 0); if (!bytes) return '—'; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function formatOptionalTime(value?: string | null) { return value ? formatDateTimeYmdHm(value) : '—'; }
function formatDuration(value?: number | null) { if (value == null) return '—'; return value < 1000 ? `${value} ms` : `${(value / 1000).toFixed(1)} s`; }
function indexRowKey(row: DatabaseIndexInfo) { return `${row.indexName}-${row.seqInIndex}`; }
function statusText(status: BackupJobStatus) { return ({ PENDING: '等待中', RUNNING: '执行中', SUCCESS: '成功', FAILED: '失败', SKIPPED: '已跳过' })[status]; }
function statusColor(status: BackupJobStatus) { return ({ PENDING: 'default', RUNNING: 'processing', SUCCESS: 'success', FAILED: 'error', SKIPPED: 'warning' })[status]; }

async function loadSetting() { loadingSetting.value = true; settingError.value = ''; settingLoaded.value = false; try { const data = await getDatabaseBackupSetting(); Object.assign(setting, data); settingLoaded.value = true; } catch (error) { settingError.value = errorMessage(error); } finally { loadingSetting.value = false; } }
async function loadOverview() { loadingOverview.value = true; overviewError.value = ''; overview.value = null; try { overview.value = await getDatabaseBackupOverview(); } catch (error) { overviewError.value = errorMessage(error); } finally { loadingOverview.value = false; } }
function reloadBackupSummary() { void Promise.all([loadSetting(), loadOverview()]); }
async function saveSetting() { if (!settingLoaded.value) return; savingSetting.value = true; try { await updateDatabaseBackupSetting({ ...setting }); message.success('备份设置已保存'); await loadOverview(); } catch (error) { message.error(errorMessage(error)); } finally { savingSetting.value = false; } }
async function loadJobs() { loadingJobs.value = true; jobsError.value = ''; try { const data = await listDatabaseBackupJobs({ page: jobPagination.current, pageSize: jobPagination.pageSize }); jobs.value = data.list; jobPagination.total = data.total; } catch (error) { jobs.value = []; jobPagination.total = 0; jobsError.value = errorMessage(error); } finally { loadingJobs.value = false; } }
function onJobTableChange(pagination: TablePaginationConfig) { jobPagination.current = pagination.current || 1; jobPagination.pageSize = pagination.pageSize || 20; void loadJobs(); }
function confirmManualBackup() { Modal.confirm({ title: '立即执行数据库备份？', content: '任务成功并完整校验后，会覆盖当前环境上一份有效备份文件。', okText: '开始备份', async onOk() { creatingBackup.value = true; try { await createDatabaseBackup(); message.success('备份任务已创建'); jobPagination.current = 1; await Promise.all([loadJobs(), loadOverview()]); } catch (error) { message.error(errorMessage(error)); throw error; } finally { creatingBackup.value = false; } } }); }
async function loadTables() { loadingTables.value = true; tablesError.value = ''; try { tables.value = await listDatabaseTables({ keyword: tableKeyword.value.trim() || undefined }); } catch (error) { tables.value = []; tablesError.value = errorMessage(error); } finally { loadingTables.value = false; } }
async function openStructure(tableName: string) { structureOpen.value = true; loadingStructure.value = true; structure.value = null; try { structure.value = await getDatabaseTableStructure(tableName); } catch (error) { message.error(errorMessage(error)); structureOpen.value = false; } finally { loadingStructure.value = false; } }
watch(activeTab, (tab) => { if (tab === 'tables' && !tables.value.length) void loadTables(); });
onMounted(() => { void Promise.all([loadSetting(), loadOverview(), loadJobs()]); });
</script>

<style scoped>
.database-card { background: #fff; border: 1px solid #e7e7e7; border-radius: 6px; padding: 0 24px 24px; }
.page-alert, .section-alert { margin-bottom: 16px; }.status-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-bottom: 20px; }.status-card { border-color: #e7e7e7; }.status-card__hint { margin-top: 8px; min-height: 18px; color: #8c8c8c; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.section-block { border-top: 1px solid #f0f0f0; padding-top: 20px; margin-top: 20px; }.section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }.section-heading h2 { margin: 0 0 4px; font-size: 16px; color: #1f2329; }.section-heading p { margin: 0; color: #8c8c8c; font-size: 13px; }.setting-form { display: grid; grid-template-columns: 150px 220px 150px 150px; gap: 16px; max-width: 860px; }.setting-form :deep(.ant-form-item) { margin-bottom: 0; }.setting-form :deep(.ant-select), .setting-form :deep(.ant-input-number) { width: 100%; }.table-heading { margin-top: 16px; }.table-toolbar { width: min(480px, 100%); margin-bottom: 16px; }.error-text { display: block; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #d54941; }.structure-summary { margin-bottom: 20px; }.drawer-heading { margin: 22px 0 12px; font-size: 15px; }
.search-icon { color: #8c8c8c; cursor: pointer; }
@media (max-width: 1100px) { .status-grid { grid-template-columns: 1fr; }.setting-form { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
