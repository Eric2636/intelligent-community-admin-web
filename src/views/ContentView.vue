<template>
  <div class="table-card">
    <div class="toolbar">
      <a-input-search v-model:value="keyword" :placeholder="`搜索${title}`" style="width: 280px" @search="load" />
      <a-select v-model:value="visibility" style="width: 160px" @change="load" placeholder="是否上架">
        <a-select-option value="">全部</a-select-option>
        <a-select-option value="ONLINE">已上架</a-select-option>
        <a-select-option value="OFFLINE">未上架</a-select-option>
      </a-select>
      <a-button @click="load">刷新</a-button>
    </div>
    <a-table
      class="data-table"
      size="middle"
      row-key="id"
      :loading="loading"
      :columns="columns"
      :data-source="rows"
      :pagination="pagination"
      :scroll="{ x: 988 }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'title'">
          <a-tooltip :title="titleTooltip(record) || undefined" placement="topLeft">
            <span class="content-title-cell">{{ record.title?.trim() || '-' }}</span>
          </a-tooltip>
        </template>
        <template v-if="column.key === 'text'">
          <a-tooltip :title="textTooltip(record) || undefined" placement="topLeft">
            <span class="content-text-cell">{{ textPreview(record) }}</span>
          </a-tooltip>
        </template>
        <template v-if="column.key === 'visibility'">
          <a-switch
            size="small"
            :checked="record.visibility === 'ONLINE'"
            @change="(checked: unknown) => toggleVisibility(record.id, Boolean(checked))"
          />
        </template>
        <template v-if="column.key === 'pinned'">
          <a-switch
            size="small"
            :checked="record.pinned"
            @change="(checked: unknown) => togglePinned(record.id, Boolean(checked))"
          />
        </template>
        <template v-if="column.key === 'author'">
          {{ recordAuthorName(record) || '-' }}
        </template>
        <template v-if="column.key === 'createdAt'">
          {{ formatDateTimeYmdHm(record.createdAt) }}
        </template>
        <template v-if="column.key === 'actions'">
          <a-space>
            <a-button size="small" @click="openDetail(record.id)">详情</a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="detailOpen" :title="`${title}详情`" width="900px" :footer="null" destroy-on-close>
      <a-spin :spinning="detailLoading">
        <!-- Header: 作者 + 时间（对标小程序） -->
        <div class="mp-card">
          <div class="mp-head">
            <div class="mp-author">
              <span class="mp-author__name">{{ detail?.authorName || detail?.publisherName || '用户' }}</span>
              <span class="mp-author__time">{{ detail?.createdAt ? formatDateTimeYmdHm(detail.createdAt) : '' }}</span>
            </div>
            <div class="mp-tags">
              <a-tag v-if="detail?.visibility" :color="detail.visibility === 'ONLINE' ? 'green' : 'red'">
                {{ detail.visibility === 'ONLINE' ? '已上架' : '未上架' }}
              </a-tag>
              <a-tag v-if="detail?.pinned" color="blue">置顶</a-tag>
            </div>
          </div>

          <div class="mp-title">{{ detail?.title || '-' }}</div>

          <!-- Content blocks per type -->
          <template v-if="type === 'errands'">
            <div class="mp-content" v-if="detail?.content">{{ detail.content }}</div>
            <div class="mp-row mp-row--space">
              <div class="mp-reward">¥{{ detail?.reward ?? '0' }}</div>
              <div class="mp-status">{{ detail?.statusText || detail?.status || '-' }}</div>
            </div>
            <div class="mp-hint">佣金由双方线下自行结算，平台不参与支付</div>
            <div class="mp-sub" v-if="detail?.claimerName && String(detail?.status || '').toLowerCase() !== 'pending_take'">
              接单人：{{ detail.claimerName }}
            </div>
            <div class="mp-meta">
              <span>浏览 {{ detail?.viewCount ?? 0 }}</span>
              <span>回复 {{ detail?.replyCount ?? 0 }}</span>
              <span>点赞 {{ detail?.likeCount ?? 0 }}</span>
            </div>

            <div class="mp-section-title">全部回复 ({{ normArray(detail?.replies).length }})</div>
            <a-list class="mp-list" size="small" :data-source="normArray(detail?.replies)" :locale="{ emptyText: '暂无回复' }">
              <template #renderItem="{ item }">
                <a-list-item class="mp-reply">
                  <div class="mp-reply__head">
                    <span class="mp-reply__author">{{ item.authorName || '用户' }}</span>
                    <span class="mp-reply__time">{{ item.createTime ? formatDateTimeYmdHm(item.createTime) : '' }}</span>
                  </div>
                  <div class="mp-reply__content">{{ item.content || '-' }}</div>
                </a-list-item>
              </template>
            </a-list>
          </template>

          <template v-else-if="type === 'posts'">
            <div class="mp-content" v-if="detail?.content">{{ detail.content }}</div>
            <div class="mp-media" v-if="normArray(detail?.images).length || normArray(detail?.videos).length">
              <div class="mp-media-grid">
                <a-image v-for="(u, idx) in normArray(detail?.images)" :key="`img-${idx}`" :src="String(u)" />
                <video v-for="(u, idx) in normArray(detail?.videos)" :key="`vid-${idx}`" :src="String(u)" controls />
              </div>
            </div>
            <div class="mp-meta">
              <span>浏览 {{ detail?.viewCount ?? 0 }}</span>
              <span>回复 {{ detail?.replyCount ?? 0 }}</span>
              <span>点赞 {{ detail?.likeCount ?? 0 }}</span>
            </div>

            <div class="mp-section-title">全部回复 ({{ normArray(detail?.replies).length }})</div>
            <a-list class="mp-list" size="small" :data-source="normArray(detail?.replies)" :locale="{ emptyText: '暂无回复' }">
              <template #renderItem="{ item }">
                <a-list-item class="mp-reply">
                  <div class="mp-reply__wrap" :style="{ paddingLeft: `${Math.min(4, Number(item.depth || 0)) * 16}px` }">
                    <div class="mp-reply__head">
                      <span class="mp-reply__author">{{ item.authorName || '用户' }}</span>
                      <span class="mp-reply__time">{{ item.createTime ? formatDateTimeYmdHm(item.createTime) : '' }}</span>
                    </div>
                    <div v-if="item.replyToAuthorName" class="mp-reply__to">回复 @{{ item.replyToAuthorName }}</div>
                    <div v-if="item.content" class="mp-reply__content">{{ item.content }}</div>
                    <div class="mp-media" v-if="normArray(item.images).length || normArray(item.videos).length">
                      <div class="mp-media-grid">
                        <a-image v-for="(u, idx) in normArray(item.images)" :key="`rimg-${idx}`" :src="String(u)" />
                        <video v-for="(u, idx) in normArray(item.videos)" :key="`rvid-${idx}`" :src="String(u)" controls />
                      </div>
                    </div>
                    <div v-if="item.reactionCounts && Object.keys(item.reactionCounts).length" class="mp-reactions">
                      <a-tag v-for="(cnt, emoji) in item.reactionCounts" :key="emoji">{{ emoji }} {{ cnt }}</a-tag>
                    </div>
                  </div>
                </a-list-item>
              </template>
            </a-list>
          </template>

          <template v-else-if="type === 'items'">
            <div class="mp-media mp-media--hero">
              <div class="mp-media-grid mp-media-grid--hero" v-if="itemPreviewImages(detail).length || normArray(detail?.videos).length">
                <a-image v-for="(u, idx) in itemPreviewImages(detail)" :key="`img-${idx}`" :src="String(u)" />
                <video v-for="(u, idx) in normArray(detail?.videos)" :key="`vid-${idx}`" :src="String(u)" controls />
              </div>
              <div v-else class="mp-media-empty">暂无媒体</div>
            </div>
            <div class="mp-price" v-if="detail?.price">{{ detail.price }}{{ detail?.unit || '元' }}</div>
            <div class="mp-subtime">{{ detail?.createdAt ? formatDateTimeYmdHm(detail.createdAt) : '' }}</div>
            <div class="mp-content">{{ detail?.desc || '-' }}</div>
            <div class="mp-sub">联系：{{ detail?.contact || '-' }}</div>

            <div class="mp-section-title">评论 ({{ normArray(detail?.comments).length }})</div>
            <a-list class="mp-list" size="small" :data-source="normArray(detail?.comments)" :locale="{ emptyText: '暂无评论' }">
              <template #renderItem="{ item }">
                <a-list-item class="mp-reply">
                  <div class="mp-reply__head">
                    <span class="mp-reply__author">{{ item.userName || '用户' }}</span>
                    <span class="mp-reply__time">{{ item.createdAt ? formatDateTimeYmdHm(item.createdAt) : '' }}</span>
                  </div>
                  <div v-if="item.content" class="mp-reply__content">{{ item.content }}</div>
                  <div class="mp-media" v-if="normArray(item.images).length">
                    <div class="mp-media-grid">
                      <a-image v-for="(u, idx) in normArray(item.images)" :key="`cimg-${idx}`" :src="String(u)" />
                    </div>
                  </div>
                  <div v-if="normArray(item.replies).length" class="mp-sublist">
                    <div class="mp-subitem" v-for="(sub, idx) in normArray(item.replies)" :key="idx">
                      <div class="mp-reply__head">
                        <span class="mp-reply__author">{{ sub.userName || '用户' }}</span>
                        <span class="mp-reply__time">{{ sub.createdAt ? formatDateTimeYmdHm(sub.createdAt) : '' }}</span>
                      </div>
                      <div v-if="sub.replyToAuthorName" class="mp-reply__to">回复 @{{ sub.replyToAuthorName }}</div>
                      <div v-if="sub.content" class="mp-reply__content">{{ sub.content }}</div>
                      <div class="mp-media" v-if="normArray(sub.images).length">
                        <div class="mp-media-grid">
                          <a-image v-for="(u, idx2) in normArray(sub.images)" :key="`scimg-${idx2}`" :src="String(u)" />
                        </div>
                      </div>
                    </div>
                  </div>
                </a-list-item>
              </template>
            </a-list>
          </template>

          <template v-else-if="type === 'tasks'">
            <div class="mp-row mp-row--space">
              <div class="mp-reward">佣金 ¥{{ detail?.reward ?? '0' }}</div>
              <div class="mp-status">{{ detail?.status || '-' }}</div>
            </div>
            <div class="mp-content" v-if="detail?.desc">{{ detail.desc }}</div>
            <div class="mp-media" v-if="normArray(detail?.images).length || normArray(detail?.videos).length">
              <div class="mp-media-grid">
                <a-image v-for="(u, idx) in normArray(detail?.images)" :key="`img-${idx}`" :src="String(u)" />
                <video v-for="(u, idx) in normArray(detail?.videos)" :key="`vid-${idx}`" :src="String(u)" controls />
              </div>
            </div>
            <div class="mp-kv">
              <div class="mp-kv__row"><span class="mp-kv__k">地点</span>{{ formatLocation(detail?.location) }}</div>
              <div class="mp-kv__row"><span class="mp-kv__k">发布者</span>{{ detail?.publisherName || '-' }}</div>
              <div class="mp-kv__row" v-if="detail?.takerName"><span class="mp-kv__k">接单人</span>{{ detail?.takerName }}</div>
              <div class="mp-kv__row"><span class="mp-kv__k">发布时间</span>{{ detail?.createdAt ? formatDateTimeYmdHm(detail.createdAt) : '-' }}</div>
              <div class="mp-kv__row" v-if="detail?.claimedAt"><span class="mp-kv__k">领取时间</span>{{ formatDateTimeYmdHm(detail.claimedAt) }}</div>
            </div>
            <div class="mp-proof" v-if="detail?.proofText || normArray(detail?.proofImages).length">
              <div class="mp-section-title">完成说明</div>
              <div class="mp-content" v-if="detail?.proofText">{{ detail.proofText }}</div>
              <div class="mp-media" v-if="normArray(detail?.proofImages).length">
                <div class="mp-media-grid">
                  <a-image v-for="(u, idx) in normArray(detail?.proofImages)" :key="`pimg-${idx}`" :src="String(u)" />
                </div>
              </div>
            </div>
          </template>

        </div>
      </a-spin>

      <div class="detail-footer">
        <a-button @click="detailOpen = false">关闭</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Modal, message } from 'ant-design-vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import {
  errorMessage,
  getContentDetail,
  listContents,
  updateContentState,
} from '../api/admin';
import { formatDateTimeYmdHm } from '../utils/date';
import type { ContentItem, ContentType, ContentVisibility } from '../types/api';

const route = useRoute();
const loading = ref(false);
const keyword = ref('');
const visibility = ref<'' | ContentVisibility>('');
const rows = ref<ContentItem[]>([]);
const pagination = reactive<TablePaginationConfig>({ current: 1, pageSize: 20, total: 0 });

const detailOpen = ref(false);
const detailLoading = ref(false);
const detail = ref<any>(null);

const type = computed(() => route.params.type as ContentType);
const title = computed(() => {
  const map: Record<ContentType, string> = {
    errands: '业主互助',
    posts: '小区留言',
    items: '小区市场',
    tasks: '任务管理',
  };
  return map[type.value] || '模块管理';
});

const columns = [
  { title: '标题', dataIndex: 'title', key: 'title', width: 220 },
  { title: '内容', key: 'text', width: 220 },
  { title: '是否上架', key: 'visibility', width: 108, align: 'center' as const },
  { title: '是否置顶', key: 'pinned', width: 108, align: 'center' as const },
  { title: '发布人', key: 'author', ellipsis: true, width: 112 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 156 },
  { title: '操作', key: 'actions', width: 92, fixed: 'right' as const },
];

async function load() {
  loading.value = true;
  try {
    const data = await listContents(type.value, {
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: keyword.value || undefined,
      visibility: visibility.value || undefined,
    });
    rows.value = data.list;
    pagination.total = data.total;
  } catch (error) {
    message.error(errorMessage(error));
  } finally {
    loading.value = false;
  }
}

function onTableChange(page: TablePaginationConfig) {
  pagination.current = page.current || 1;
  pagination.pageSize = page.pageSize || 20;
  load();
}

const shelfHelpOnline =
  '上架后：小程序端列表与详情中可正常展示该条内容，用户可浏览（互动仍受账号状态、业务规则限制）。';
const shelfHelpOffline =
  '下架后：小程序端列表与详情中不再展示该条内容，用户无法通过常规入口看到；数据仍保留在后台，可随时重新上架。';

function toggleVisibility(id: string, online: boolean) {
  Modal.confirm({
    title: online ? '确认上架？' : '确认下架？',
    content: online ? shelfHelpOnline : shelfHelpOffline,
    okText: '确定',
    cancelText: '取消',
    async onOk() {
      await updateContentState(type.value, id, { visibility: online ? 'ONLINE' : 'OFFLINE' });
      message.success('操作成功');
      load();
    },
  });
}

const pinHelpOn =
  '置顶后：在该模块的列表中会优先展示在靠前位置（与未置顶内容区分），便于运营重点曝光；不影响下架状态，下架后小程序端仍不可见。';
const pinHelpOff =
  '取消置顶后：该条按发布时间等默认规则参与排序，不再固定靠前。';

function togglePinned(id: string, pinned: boolean) {
  Modal.confirm({
    title: pinned ? '确认置顶？' : '确认取消置顶？',
    content: pinned ? pinHelpOn : pinHelpOff,
    okText: '确定',
    cancelText: '取消',
    async onOk() {
      try {
        await updateContentState(type.value, id, { pinned });
        message.success('操作成功');
        load();
      } catch (error) {
        message.error(errorMessage(error));
      }
    },
  });
}

async function openDetail(id: string) {
  detailOpen.value = true;
  detailLoading.value = true;
  detail.value = null;
  try {
    detail.value = await getContentDetail(type.value, id);
  } catch (error) {
    message.error(errorMessage(error));
  } finally {
    detailLoading.value = false;
  }
}

watch(type, () => {
  pagination.current = 1;
  load();
});

onMounted(load);

function titleTooltip(record: ContentItem) {
  const t = record.title?.trim();
  return t || '';
}

function textPreview(record: ContentItem) {
  const s = String(record.desc ?? record.content ?? '').trim();
  return s || '-';
}

function textTooltip(record: ContentItem) {
  const s = String(record.desc ?? record.content ?? '').trim();
  return s || '';
}

function recordAuthorName(record: ContentItem): string {
  return String(record.authorName || record.publisherName || '').trim();
}

function normArray(v: unknown): any[] {
  if (Array.isArray(v)) return v.filter(Boolean);
  return [];
}

function itemPreviewImages(v: any): any[] {
  const mainImages = normArray(v?.mainImages);
  const subImages = normArray(v?.subImages);
  const legacyImages = normArray(v?.images);
  const list = (mainImages.length ? mainImages.concat(subImages) : legacyImages).filter(Boolean);
  return list;
}

function formatLocation(v: unknown) {
  if (v == null) return '-';
  if (typeof v === 'string') return v || '-';
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
</script>

<style scoped>
.content-title-cell,
.content-text-cell {
  font-size: 12px;
  line-height: 1.5;
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-title-cell {
  color: rgba(0, 0, 0, 0.75);
}

.content-text-cell {
  color: rgba(0, 0, 0, 0.65);
}

.detail-json {
  margin: 0;
  max-height: 320px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.45;
  background: #fafafa;
  padding: 8px;
  border-radius: 6px;
}

.detail-footer {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.video-grid video {
  width: 100%;
  max-height: 220px;
  border-radius: 8px;
  background: #000;
}

.mp-card {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  padding: 14px 14px 10px;
}

.mp-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.mp-author {
  display: flex;
  gap: 10px;
  align-items: baseline;
  flex-wrap: wrap;
}

.mp-author__name {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.mp-author__time {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.mp-tags :deep(.ant-tag) {
  margin-inline-end: 0;
}

.mp-title {
  margin-top: 10px;
  font-size: 16px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.4;
}

.mp-content {
  margin-top: 8px;
  white-space: pre-wrap;
  word-break: break-word;
  color: rgba(0, 0, 0, 0.78);
  line-height: 1.6;
}

.mp-row {
  margin-top: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.mp-row--space {
  justify-content: space-between;
}

.mp-reward {
  font-size: 18px;
  font-weight: 700;
  color: #ff4d4f;
}

.mp-status {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.04);
  color: rgba(0, 0, 0, 0.75);
  font-size: 12px;
}

.mp-hint {
  margin-top: 8px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.mp-sub,
.mp-subtime {
  margin-top: 8px;
  color: rgba(0, 0, 0, 0.55);
  font-size: 13px;
}

.mp-meta {
  margin-top: 10px;
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  color: rgba(0, 0, 0, 0.55);
  font-size: 12px;
}

.mp-section-title {
  margin-top: 14px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
}

.mp-list {
  margin-top: 6px;
}

.mp-reply :deep(.ant-list-item) {
  padding-left: 0;
  padding-right: 0;
}

.mp-reply__wrap {
  width: 100%;
}

.mp-reply__head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.mp-reply__author {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.8);
}

.mp-reply__time {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.mp-reply__to {
  margin-top: 4px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.mp-reply__content {
  margin-top: 4px;
  white-space: pre-wrap;
  word-break: break-word;
  color: rgba(0, 0, 0, 0.78);
  line-height: 1.55;
}

.mp-media {
  margin-top: 10px;
}

.mp-media-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.mp-media-grid :deep(.ant-image),
.mp-media-grid video {
  width: 100%;
  height: 92px;
  border-radius: 10px;
  overflow: hidden;
}

.mp-media-grid :deep(.ant-image-img) {
  object-fit: cover;
}

.mp-media-grid video {
  background: #000;
  object-fit: cover;
}

.mp-media--hero {
  margin-top: 12px;
}

.mp-media-grid--hero :deep(.ant-image),
.mp-media-grid--hero video {
  height: 140px;
}

.mp-media-empty {
  padding: 18px;
  text-align: center;
  color: rgba(0, 0, 0, 0.45);
  background: rgba(0, 0, 0, 0.02);
  border-radius: 10px;
}

.mp-price {
  margin-top: 10px;
  font-size: 18px;
  font-weight: 800;
  color: rgba(0, 0, 0, 0.88);
}

.mp-reactions {
  margin-top: 8px;
}

.mp-sublist {
  margin-top: 10px;
  padding-left: 16px;
  border-left: 2px solid rgba(0, 0, 0, 0.06);
}

.mp-subitem + .mp-subitem {
  margin-top: 10px;
}

.mp-kv {
  margin-top: 12px;
  display: grid;
  gap: 8px;
  color: rgba(0, 0, 0, 0.75);
}

.mp-kv__row {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 8px;
}

.mp-kv__k {
  color: rgba(0, 0, 0, 0.45);
}

</style>
