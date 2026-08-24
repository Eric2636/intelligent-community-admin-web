<template>
  <div class="admin-page">
    <PageHeader
      :title="title"
      :description="pageDescription"
      :breadcrumbs="['模块管理', title]"
    >
      <template #actions>
        <a-button v-if="canCreateContent" type="primary" @click="openCreate">新建{{ title }}</a-button>
        <a-button v-if="canPublishAnnouncement && type === 'posts'" @click="openCreateAnnouncement">
          发布公告
        </a-button>
      </template>
    </PageHeader>
    <div class="table-card">
    <FilterPanel>
      <label class="filter-field filter-field--wide">
        <span class="filter-field__label">关键词</span>
        <a-input-search v-model:value="keyword" :placeholder="`搜索${title}`" allow-clear @search="submitSearch" />
      </label>
      <label class="filter-field">
        <span class="filter-field__label">上架状态</span>
        <a-select v-model:value="visibility" placeholder="全部状态">
          <a-select-option value="">全部状态</a-select-option>
          <a-select-option value="ONLINE">已上架</a-select-option>
          <a-select-option value="OFFLINE">已下架</a-select-option>
        </a-select>
      </label>
      <label v-if="type === 'posts'" class="filter-field filter-field--wide">
        <span class="filter-field__label">发布用户</span>
        <a-input v-model:value="authorKeyword" allow-clear placeholder="发布者昵称" @pressEnter="submitSearch" />
      </label>
      <template #actions>
        <a-button type="primary" @click="submitSearch">查询</a-button>
        <a-button @click="resetSearch">重置</a-button>
      </template>
    </FilterPanel>
    <a-alert v-if="loadError" class="load-alert" type="error" show-icon :message="loadError">
      <template #action><a-button size="small" @click="load()">重新加载</a-button></template>
    </a-alert>
    <TableToolbar :total="Number(pagination.total || 0)" :loading="loading" @refresh="load()" />
    <a-table
      class="data-table"
      size="middle"
      row-key="__rowKey"
      :loading="loading"
      :columns="columns"
      :data-source="rows"
      :pagination="pagination"
      :scroll="{ x: 1120 }"
      :sticky="{ offsetHeader: 56 }"
      :locale="{ emptyText: keyword || visibility ? '没有符合当前筛选条件的内容' : `暂无${title}数据` }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'title'">
          <a-tooltip :title="titleTooltip(record) || undefined" placement="topLeft">
            <span class="content-title-cell">
              <a-tag v-if="record.postType === 'ANNOUNCEMENT'" color="gold">公告</a-tag>
              {{ record.title?.trim() || '-' }}
            </span>
          </a-tooltip>
        </template>
        <template v-if="column.key === 'text'">
          <a-tooltip :title="textTooltip(record) || undefined" placement="topLeft">
            <span class="content-text-cell">{{ textPreview(record) }}</span>
          </a-tooltip>
        </template>
        <template v-if="column.key === 'visibility'">
          <a-tag :color="record.visibility === 'ONLINE' ? 'green' : 'default'">
            {{ record.visibility === 'ONLINE' ? '已上架' : '已下架' }}
          </a-tag>
        </template>
        <template v-if="column.key === 'pinned'">
          <a-tag v-if="record.pinned" color="blue">已置顶</a-tag>
          <span v-else class="table-empty-value">—</span>
        </template>
        <template v-if="column.key === 'author'">
          {{ recordAuthorName(record) || '-' }}
        </template>
        <template v-if="column.key === 'createdAt'">
          {{ formatDateTimeYmdHm(record.createdAt) }}
        </template>
        <template v-if="column.key === 'validUntil'">
          {{ record.validUntil ? formatDateTimeYmdHm(record.validUntil) : '-' }}
        </template>
        <template v-if="column.key === 'actions'">
          <a-space>
            <a-button type="link" size="small" @click="openDetail(record.id)">详情</a-button>
            <a-button
              v-if="canModifyContent(record)"
              type="link"
              size="small"
              @click="toggleVisibility(record.id, record.visibility !== 'ONLINE')"
            >
              {{ record.visibility === 'ONLINE' ? '下架' : '上架' }}
            </a-button>
            <a-button v-if="canModifyContent(record)" type="link" size="small" @click="togglePinnedById(record.id)">
              {{ record.pinned ? '取消置顶' : '置顶' }}
            </a-button>
            <a-button v-if="canModifyContent(record)" type="link" size="small" @click="openEdit(record)">编辑</a-button>
            <a-button v-if="canModifyContent(record)" type="link" size="small" danger @click="confirmDelete(record)">删除</a-button>
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
          <template v-if="type === 'posts'">
          <div class="mp-tags" v-if="detail?.postType === 'ANNOUNCEMENT' || detail?.validUntil">
            <a-tag v-if="detail?.postType === 'ANNOUNCEMENT'" color="gold">公告</a-tag>
            <a-tag v-if="detail?.validUntil">有效至 {{ formatDateTimeYmdHm(detail.validUntil) }}</a-tag>
          </div>
            <div class="mp-content" v-if="detail?.content">{{ detail.content }}</div>
            <div v-if="normArray(detail?.attachments).length" class="mp-attachments">
              <a-list size="small" :data-source="normArray(detail?.attachments)">
                <template #renderItem="{ item }"><a-list-item><a :href="item.url" target="_blank" rel="noreferrer">{{ item.name || '附件' }}</a><span>{{ formatAttachmentSize(item.sizeBytes) }}</span></a-list-item></template>
              </a-list>
            </div>
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
              <div v-else class="mp-media-empty"><FileImageOutlined /></div>
            </div>
            <div class="mp-price" v-if="detail?.price">{{ detail.price }}{{ detail?.unit || '元' }}</div>
            <div class="mp-subtime">{{ detail?.createdAt ? formatDateTimeYmdHm(detail.createdAt) : '' }}</div>
            <div class="mp-content">{{ detail?.desc || '-' }}</div>
            <div v-if="detail?.wechatContact" class="mp-sub">微信号：{{ detail.wechatContact }}</div>
            <div v-if="detail?.phoneContact" class="mp-sub">{{ detail.phoneIsWechat ? '手机号（可添加微信）' : '手机号' }}：{{ detail.phoneContact }}</div>
            <div v-if="!detail?.wechatContact && !detail?.phoneContact" class="mp-sub">联系方式：{{ detail?.contact || '-' }}</div>
            <div class="mp-kv" v-if="detail?.locationName || detail?.locationAddress || detail?.latitude || detail?.longitude">
              <div class="mp-kv__row"><span class="mp-kv__k">门店</span>{{ detail?.locationName || '-' }}</div>
              <div class="mp-kv__row"><span class="mp-kv__k">地址</span>{{ detail?.locationAddress || '-' }}</div>
              <div class="mp-kv__row"><span class="mp-kv__k">坐标</span>{{ detail?.latitude || '-' }}, {{ detail?.longitude || '-' }}</div>
            </div>

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

    <a-modal
      v-model:open="editOpen"
      :title="editForm.postType === 'ANNOUNCEMENT' ? (editMode === 'create' ? '发布公告' : '编辑公告') : (editMode === 'create' ? `新建${title}` : `编辑${title}`)"
      ok-text="确认"
      cancel-text="取消"
      :width="type === 'posts' ? '760px' : '640px'"
      :confirm-loading="editSaving"
      destroy-on-close
      @ok="submitEdit"
    >
      <a-spin :spinning="editDetailLoading">
      <a-form layout="vertical" class="edit-form">
        <template v-if="type === 'posts'">
          <div class="edit-post-layout">
            <section class="edit-section">
              <div class="edit-section__head">
                <div>
                  <div class="edit-section__title">基础信息</div>
                  <div class="edit-section__sub">{{ editForm.postType === 'ANNOUNCEMENT' ? '公告会展示在小程序留言页顶部' : '普通留言会进入小区留言列表' }}</div>
                </div>
                <a-tag :color="editForm.postType === 'ANNOUNCEMENT' ? 'gold' : 'blue'">
                  {{ editForm.postType === 'ANNOUNCEMENT' ? '公告' : '普通留言' }}
                </a-tag>
              </div>

              <div class="edit-form-grid edit-form-grid--two">
                <a-form-item label="内容类型">
                  <a-radio-group v-model:value="editForm.postType" button-style="solid">
                    <a-radio-button value="NORMAL">普通留言</a-radio-button>
                    <a-radio-button value="ANNOUNCEMENT">公告</a-radio-button>
                  </a-radio-group>
                </a-form-item>
                <a-form-item v-if="editForm.postType === 'ANNOUNCEMENT'" label="公告过期时间" required>
                  <a-input v-model:value="editForm.validUntil" type="datetime-local" />
                </a-form-item>
              </div>

              <a-form-item label="标题" required>
                <a-input v-model:value="editForm.title" placeholder="请输入标题" />
              </a-form-item>
              <a-form-item label="正文">
                <a-textarea v-model:value="editForm.content" :rows="6" placeholder="请输入正文内容" />
              </a-form-item>
            </section>

            <section class="edit-section">
              <div class="edit-section__head">
                <div class="edit-section__title">图片和视频</div>
              </div>
              <div class="edit-form-grid edit-form-grid--two">
                <a-form-item label="图片">
                  <div v-if="linesToUrls(editForm.imagesText).length" class="edit-media-list edit-media-list--compact">
                    <div v-for="(url, idx) in linesToUrls(editForm.imagesText)" :key="`${url}-${idx}`" class="edit-media-item">
                      <a-image :src="url" />
                      <a-button size="small" danger shape="circle" title="删除" @click="removeMediaUrl('imagesText', idx)">
                        <template #icon><DeleteOutlined /></template>
                      </a-button>
                    </div>
                  </div>
                  <a-upload
                    accept="image/*"
                    :show-upload-list="false"
                    :custom-request="(options: any) => uploadToMediaField(options, 'imagesText', 'img')"
                  >
                    <a-button :loading="mediaUploading.imagesText" title="上传图片" aria-label="上传图片">
                      <template #icon><PlusOutlined /></template>
                      上传图片
                    </a-button>
                  </a-upload>
                </a-form-item>

                <a-form-item label="视频">
                  <div v-if="linesToUrls(editForm.videosText).length" class="edit-media-list edit-media-list--compact">
                    <div v-for="(url, idx) in linesToUrls(editForm.videosText)" :key="`${url}-${idx}`" class="edit-media-item edit-media-item--video">
                      <video :src="url" controls />
                      <a-button size="small" danger shape="circle" title="删除" @click="removeMediaUrl('videosText', idx)">
                        <template #icon><DeleteOutlined /></template>
                      </a-button>
                    </div>
                  </div>
                  <a-upload
                    accept="video/*"
                    :show-upload-list="false"
                    :custom-request="(options: any) => uploadToMediaField(options, 'videosText', 'vid')"
                  >
                    <a-button :loading="mediaUploading.videosText" title="上传视频" aria-label="上传视频">
                      <template #icon><VideoCameraOutlined /></template>
                      上传视频
                    </a-button>
                  </a-upload>
                  </a-form-item>
                </div>
            </section>

            <section class="edit-section">
              <div class="edit-section__head"><div><div class="edit-section__title">附件</div><div class="edit-section__sub">最多5个，单个不超过20MB，支持秒传</div></div></div>
              <div v-for="(attachment, idx) in editForm.attachments" :key="attachment.mediaAssetId" class="forum-attachment-row">
                <span class="forum-attachment-row__name">{{ attachment.name }}</span><span>{{ formatAttachmentSize(attachment.sizeBytes) }}</span>
                <a-button size="small" danger @click="removeForumAttachment(idx)">移除</a-button>
              </div>
              <a-upload v-if="editForm.attachments.length < 5" :show-upload-list="false" :custom-request="uploadForumAttachmentToForm" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt">
                <a-button :loading="attachmentUploading">上传附件</a-button>
              </a-upload>
            </section>

            <section class="edit-section edit-section--settings">
              <div class="edit-section__head">
                <div class="edit-section__title">发布设置</div>
              </div>
              <div class="edit-form-grid edit-form-grid--settings">
                <a-form-item label="上架">
                  <a-select v-model:value="editForm.visibility">
                    <a-select-option value="ONLINE">已上架</a-select-option>
                    <a-select-option value="OFFLINE">未上架</a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item label="置顶">
                  <a-switch v-model:checked="editForm.pinned" />
                </a-form-item>
              </div>
            </section>
          </div>
        </template>

        <template v-else-if="type === 'items'">
          <a-form-item label="分类" required>
            <a-select v-model:value="editForm.categoryId">
              <a-select-option v-for="c in mallCategories" :key="c.id" :value="c.id" :disabled="!c.enabled">
                {{ c.name }}{{ c.enabled ? '' : '（已停用）' }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="标题" required>
            <a-input v-model:value="editForm.title" />
          </a-form-item>
          <a-form-item label="描述">
            <a-textarea v-model:value="editForm.desc" :rows="4" placeholder="可选" />
          </a-form-item>
          <a-form-item label="价格">
            <a-input v-model:value="editForm.price" placeholder="选填" />
          </a-form-item>
          <a-form-item label="单位">
            <a-input v-model:value="editForm.unit" placeholder="默认 元" />
          </a-form-item>
            <div class="edit-form-grid edit-form-grid--two">
              <a-form-item label="微信号">
                <a-input v-model:value="editForm.wechatContact" placeholder="选填" />
              </a-form-item>
              <a-form-item label="手机号">
                <a-input v-model:value="editForm.phoneContact" placeholder="选填，仅支持中国大陆手机号" maxlength="11" />
              </a-form-item>
            </div>
            <a-checkbox v-model:checked="editForm.phoneIsWechat" :disabled="!editForm.phoneContact.trim()">手机号也是微信号</a-checkbox>
            <a-alert
              v-if="editForm.legacyContact && !editForm.wechatContact && !editForm.phoneContact"
              class="legacy-contact-alert"
              type="warning"
              show-icon
              :message="`历史联系方式：${editForm.legacyContact}`"
              description="请补充微信号或手机号后保存，系统将转换为新的联系方式格式。"
            />
          <a-form-item label="门店名称">
            <a-input v-model:value="editForm.locationName" placeholder="例如 洪山区人民政府店" />
          </a-form-item>
          <a-form-item label="门店地址">
            <a-textarea v-model:value="editForm.locationAddress" :rows="2" placeholder="用于小程序详情页展示" />
          </a-form-item>
          <a-form-item label="门店经纬度">
            <a-space compact>
              <a-input v-model:value="editForm.latitude" placeholder="纬度 latitude" />
              <a-input v-model:value="editForm.longitude" placeholder="经度 longitude" />
            </a-space>
          </a-form-item>
        </template>

        <template v-else-if="type === 'tasks'">
          <a-form-item label="标题" required>
            <a-input v-model:value="editForm.title" />
          </a-form-item>
          <a-form-item label="说明">
            <a-textarea v-model:value="editForm.desc" :rows="4" />
          </a-form-item>
          <a-form-item label="佣金" :required="editMode === 'create'">
            <a-input v-model:value="editForm.reward" />
          </a-form-item>
          <a-form-item label="地点">
            <a-input v-model:value="editForm.location" />
          </a-form-item>
        </template>

        <a-form-item v-if="type !== 'items' && type !== 'posts'" label="图片">
          <div v-if="linesToUrls(editForm.imagesText).length" class="edit-media-list">
            <div v-for="(url, idx) in linesToUrls(editForm.imagesText)" :key="`${url}-${idx}`" class="edit-media-item">
              <a-image :src="url" />
              <a-button size="small" danger shape="circle" title="删除" @click="removeMediaUrl('imagesText', idx)">
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </div>
          </div>
          <a-upload
            accept="image/*"
            :show-upload-list="false"
            :custom-request="(options: any) => uploadToMediaField(options, 'imagesText', 'img')"
          >
            <a-button :loading="mediaUploading.imagesText" title="上传图片" aria-label="上传图片">
              <template #icon><PlusOutlined /></template>
            </a-button>
          </a-upload>
        </a-form-item>
        <a-form-item v-if="type === 'items'" label="主图">
          <div v-if="linesToUrls(editForm.mainImagesText).length" class="edit-media-list">
            <div v-for="(url, idx) in linesToUrls(editForm.mainImagesText)" :key="`${url}-${idx}`" class="edit-media-item">
              <a-image :src="url" />
              <a-button size="small" danger shape="circle" title="删除" @click="removeMediaUrl('mainImagesText', idx)">
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </div>
          </div>
          <a-upload
            accept="image/*"
            :show-upload-list="false"
            :custom-request="(options: any) => uploadToMediaField(options, 'mainImagesText', 'img')"
          >
            <a-button :loading="mediaUploading.mainImagesText" title="上传主图" aria-label="上传主图">
              <template #icon><PlusOutlined /></template>
            </a-button>
          </a-upload>
        </a-form-item>
        <a-form-item v-if="type === 'items'" label="副图">
          <div v-if="linesToUrls(editForm.subImagesText).length" class="edit-media-list">
            <div v-for="(url, idx) in linesToUrls(editForm.subImagesText)" :key="`${url}-${idx}`" class="edit-media-item">
              <a-image :src="url" />
              <a-button size="small" danger shape="circle" title="删除" @click="removeMediaUrl('subImagesText', idx)">
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </div>
          </div>
          <a-upload
            accept="image/*"
            :show-upload-list="false"
            :custom-request="(options: any) => uploadToMediaField(options, 'subImagesText', 'img')"
          >
            <a-button :loading="mediaUploading.subImagesText" title="上传副图" aria-label="上传副图">
              <template #icon><PlusOutlined /></template>
            </a-button>
          </a-upload>
        </a-form-item>
        <a-form-item v-if="type !== 'posts'" label="视频">
          <div v-if="linesToUrls(editForm.videosText).length" class="edit-media-list">
            <div v-for="(url, idx) in linesToUrls(editForm.videosText)" :key="`${url}-${idx}`" class="edit-media-item edit-media-item--video">
              <video :src="url" controls />
              <a-button size="small" danger shape="circle" title="删除" @click="removeMediaUrl('videosText', idx)">
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </div>
          </div>
          <a-upload
            accept="video/*"
            :show-upload-list="false"
            :custom-request="(options: any) => uploadToMediaField(options, 'videosText', 'vid')"
          >
            <a-button :loading="mediaUploading.videosText" title="上传视频" aria-label="上传视频">
              <template #icon><VideoCameraOutlined /></template>
            </a-button>
          </a-upload>
        </a-form-item>

        <a-form-item v-if="type !== 'posts'" label="上架">
          <a-select v-model:value="editForm.visibility">
            <a-select-option value="ONLINE">已上架</a-select-option>
            <a-select-option value="OFFLINE">未上架</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item v-if="type !== 'posts'" label="置顶">
          <a-switch v-model:checked="editForm.pinned" />
        </a-form-item>
      </a-form>
      </a-spin>
    </a-modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { DeleteOutlined, FileImageOutlined, PlusOutlined, VideoCameraOutlined } from '@ant-design/icons-vue';
import { Modal, message } from 'ant-design-vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import {
  type AdminUploadMediaType,
  type AdminUploadModule,
  createContent,
  deleteContent,
  errorMessage,
  getContentDetail,
  getCurrentAdmin,
  listMallCategories,
  listContents,
  updateContent,
  updateContentState,
  checkAdminForumAttachment,
  uploadAdminForumAttachment,
} from '../api/admin';
import { formatDateTimeYmdHm } from '../utils/date';
import { uploadAdminMedia } from '../utils/cosUpload';
import { createLatestRequestRunner } from '../utils/latest-request';
import type { AdminUser, ContentItem, ContentType, ContentVisibility, MallCategory } from '../types/api';
import { MAX_FORUM_ATTACHMENTS, sha256File, validateForumAttachmentFile } from '../utils/forumAttachment';
import FilterPanel from '../components/admin/FilterPanel.vue';
import PageHeader from '../components/admin/PageHeader.vue';
import TableToolbar from '../components/admin/TableToolbar.vue';

const route = useRoute();
const loading = ref(false);
const loadError = ref('');
const keyword = ref('');
const visibility = ref<'' | ContentVisibility>('');
const authorKeyword = ref('');
const rows = ref<ContentItem[]>([]);
const pagination = reactive<TablePaginationConfig>({ current: 1, pageSize: 20, total: 0 });
const listRequest = createLatestRequestRunner();

const detailOpen = ref(false);
const detailLoading = ref(false);
const detail = ref<any>(null);

const mallCategories = ref<MallCategory[]>([]);

const editOpen = ref(false);
const editMode = ref<'create' | 'edit'>('create');
const editSaving = ref(false);
const editDetailLoading = ref(false);
const editingId = ref<string | null>(null);
const editForm = reactive({
  title: '',
  content: '',
  desc: '',
  reward: '',
  location: '',
  categoryId: '',
  price: '',
  unit: '元',
  wechatContact: '',
  phoneContact: '',
  phoneIsWechat: false,
  legacyContact: '',
  locationName: '',
  locationAddress: '',
  latitude: '',
  longitude: '',
  visibility: 'ONLINE' as ContentVisibility,
  pinned: false,
  postType: 'NORMAL' as 'NORMAL' | 'ANNOUNCEMENT',
  validUntil: '',
  imagesText: '',
  videosText: '',
  mainImagesText: '',
  subImagesText: '',
  attachments: [] as Array<{ mediaAssetId: string; name: string; sizeBytes: number; contentType: string; url?: string }>,
});

/** 编辑态下用于判断媒体字段是否改动，避免误传空数组清空资源 */
const editMediaSnapshot = reactive({
  imagesText: '',
  videosText: '',
  mainImagesText: '',
  subImagesText: '',
});
type MediaTextField = keyof typeof editMediaSnapshot;
const mediaUploading = reactive<Record<MediaTextField, boolean>>({
  imagesText: false,
  videosText: false,
  mainImagesText: false,
  subImagesText: false,
});
const attachmentUploading = ref(false);

const adminRef = ref<AdminUser | null>(null);

function syncAdminFromStorage() {
  try {
    const raw = localStorage.getItem('admin_user');
    adminRef.value = raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    adminRef.value = null;
  }
}

async function refreshAdmin() {
  try {
    const me = await getCurrentAdmin();
    localStorage.setItem('admin_user', JSON.stringify(me));
    adminRef.value = me;
  } catch {
    syncAdminFromStorage();
  }
}

const isSuperAdmin = computed(() => adminRef.value?.role === 'SUPERADMIN');
const boundUserId = computed(() => (adminRef.value?.boundUserId || '').trim());
const canCreateContent = computed(() => Boolean(boundUserId.value));
const canPublishAnnouncement = computed(() => Boolean(adminRef.value?.id) && adminRef.value?.enabled !== false);

function contentOwnerId(record: ContentItem): string {
  return String(record.publisherId || record.authorId || '');
}

function canModifyContent(record: ContentItem): boolean {
  if (isSuperAdmin.value) return true;
  if (!boundUserId.value) return false;
  return contentOwnerId(record) === boundUserId.value;
}

const type = computed(() => route.params.type as ContentType);
const title = computed(() => {
  const map: Record<ContentType, string> = {
    posts: '小区留言',
    items: '小区市场',
    tasks: '业主互助',
  };
  return map[type.value] || '模块管理';
});
const pageDescription = computed(() => {
  const map: Record<ContentType, string> = {
    posts: '审核和维护居民留言、社区公告、回复及置顶状态。',
    items: '管理小区市场商品、分类、上下架状态及评论内容。',
    tasks: '查看业主互助任务及其业务状态，处理违规内容。',
  };
  return map[type.value] || '维护社区业务内容。';
});

const columns = computed(() => {
  const base: any[] = [
    { title: '标题', dataIndex: 'title', key: 'title', width: 220 },
    { title: '内容', key: 'text', width: 220 },
    { title: '上架状态', key: 'visibility', width: 108, align: 'center' as const },
    { title: '置顶状态', key: 'pinned', width: 108, align: 'center' as const },
    { title: '发布人', key: 'author', ellipsis: true, width: 112 },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 156 },
  ];
  if (type.value === 'posts') {
    base.splice(5, 0, { title: '公告有效期', key: 'validUntil', width: 168 });
  }
  return [...base, { title: '操作', key: 'actions', width: 320, fixed: 'right' as const }];
});

async function load(deduplicate = false) {
  const requestType = type.value;
  const requestPage = pagination.current;
  const params = {
    page: requestPage,
    pageSize: pagination.pageSize,
    keyword: keyword.value || undefined,
    visibility: visibility.value || undefined,
    authorKeyword: type.value === 'posts' ? authorKeyword.value || undefined : undefined,
  };
  await listRequest.run({
    key: JSON.stringify({ type: requestType, ...params }),
    deduplicate,
    request: () => listContents(requestType, params),
    onSuccess: (data) => {
      loadError.value = '';
      // 行 key 必须稳定且唯一，否则 a-table 会复用错行 DOM，出现“点第 N 个开关却影响第 1 个”的错位
      rows.value = (data.list || []).map((row: any, index: number) => {
        const id = String(row?.id || row?._id || '').trim();
        const fallback = `${requestType}:${requestPage}:${index}`;
        return {
          ...row,
          id,
          __rowKey: id || fallback,
          pinned: Boolean(row?.pinned),
        };
      });
      pagination.total = data.total;
    },
    onError: (error) => {
      rows.value = [];
      pagination.total = 0;
      loadError.value = errorMessage(error);
      message.error(loadError.value);
    },
    onLoading: (value) => {
      loading.value = value;
    },
  });
}

function submitSearch() {
  pagination.current = 1;
  load(true);
}

function resetSearch() {
  keyword.value = '';
  visibility.value = '';
  authorKeyword.value = '';
  pagination.current = 1;
  load(true);
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
  const contentTitle = rows.value.find((item) => item.id === id)?.title?.trim() || id;
  Modal.confirm({
    title: online ? '确认上架？' : '确认下架？',
    content: online ? shelfHelpOnline : shelfHelpOffline,
    okText: '确认',
    cancelText: '取消',
    async onOk() {
      await updateContentState(type.value, id, { visibility: online ? 'ONLINE' : 'OFFLINE' });
      message.success(`已${online ? '上架' : '下架'}${title.value}《${contentTitle}》`);
      // 上下架会影响列表可见性与排序；回到第一页避免“操作后当前页看不到”造成误判
      pagination.current = 1;
      load();
    },
  });
}

const pinHelpOn =
  '置顶后：在该模块的列表中会优先展示在靠前位置（与未置顶内容区分），便于运营重点曝光；不影响下架状态，下架后小程序端仍不可见。';
const pinHelpOff =
  '取消置顶后：该条按发布时间等默认规则参与排序，不再固定靠前。';

function togglePinnedById(rawId: string) {
  const id = String(rawId || '').trim();
  const row = rows.value.find((item) => String(item.id || '').trim() === id);
  if (!id || !row) {
    message.error('未找到当前行数据，请刷新后重试');
    return;
  }
  const nextPinned = !Boolean(row.pinned);
  Modal.confirm({
    title: nextPinned ? '确认置顶？' : '确认取消置顶？',
    content: nextPinned ? pinHelpOn : pinHelpOff,
    okText: '确认',
    cancelText: '取消',
    async onOk() {
      try {
        await updateContentState(type.value, id, { pinned: nextPinned });
        row.pinned = nextPinned;
        rows.value = rows.value.map((item) =>
          String(item.id || '').trim() === id ? { ...item, pinned: nextPinned } : item,
        );
        message.success(`已${nextPinned ? '置顶' : '取消置顶'}${title.value}《${row.title?.trim() || id}》`);
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

function linesToUrls(text: string): string[] {
  return String(text || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function urlsToLines(arr: unknown): string {
  if (!Array.isArray(arr)) return '';
  return arr.map((u) => String(u).trim()).filter(Boolean).join('\n');
}

function contentUploadModule(): AdminUploadModule {
  const map: Record<ContentType, AdminUploadModule> = {
    posts: 'forum',
    items: 'mall',
    tasks: 'task',
  };
  return map[type.value] || 'forum';
}

function setMediaUrls(field: MediaTextField, urls: string[]) {
  editForm[field] = urls.map((u) => String(u).trim()).filter(Boolean).join('\n');
}

function appendMediaUrl(field: MediaTextField, url: string) {
  setMediaUrls(field, [...linesToUrls(editForm[field]), url]);
}

function removeMediaUrl(field: MediaTextField, index: number) {
  const urls = linesToUrls(editForm[field]);
  urls.splice(index, 1);
  setMediaUrls(field, urls);
}

function uploadErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    return String(e.message || e.error || e.errMsg || e.Code || e.code || '上传失败');
  }
  return errorMessage(error);
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toDatetimeLocalValue(value: unknown) {
  if (!value) return '';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function defaultAnnouncementValidUntil() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return toDatetimeLocalValue(d.toISOString());
}

function datetimeLocalToIso(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

function optionalNumber(value: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function defaultMallCategoryId() {
  return mallCategories.value.find((c) => c.enabled)?.id || mallCategories.value[0]?.id || '';
}

async function loadMallCategories() {
  try {
    mallCategories.value = await listMallCategories();
    if (!editForm.categoryId) editForm.categoryId = defaultMallCategoryId();
  } catch (error) {
    message.error(errorMessage(error));
  }
}

async function uploadToMediaField(options: any, field: MediaTextField, mediaType: AdminUploadMediaType) {
  const file = options.file instanceof File ? options.file : options.file?.originFileObj;
  if (!file) {
    const error = new Error('请选择要上传的文件');
    options.onError?.(error);
    message.error(error.message);
    return;
  }

  mediaUploading[field] = true;
  try {
    const url = await uploadAdminMedia(file, { module: contentUploadModule(), type: mediaType });
    appendMediaUrl(field, url);
    options.onSuccess?.({ url }, file);
    message.success('上传成功');
  } catch (error) {
    options.onError?.(error);
    message.error(uploadErrorMessage(error));
  } finally {
    mediaUploading[field] = false;
  }
}

function formatAttachmentSize(size: number) {
  const n = Number(size || 0);
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

function removeForumAttachment(index: number) {
  editForm.attachments.splice(index, 1);
}

async function uploadForumAttachmentToForm(options: any) {
  const file = options.file instanceof File ? options.file : options.file?.originFileObj;
  attachmentUploading.value = true;
  try {
    if (!file) throw new Error('请选择附件');
    if (editForm.attachments.length >= MAX_FORUM_ATTACHMENTS) throw new Error('每篇帖子最多5个附件');
    validateForumAttachmentFile(file);
    const sha256 = await sha256File(file);
    const metadata = { sha256, filename: file.name, contentType: file.type || 'application/octet-stream', sizeBytes: file.size };
    const checked = await checkAdminForumAttachment(metadata);
    const payload = checked?.exists ? checked : await uploadAdminForumAttachment(file, metadata);
    editForm.attachments.push({ mediaAssetId: payload.mediaAssetId || payload.id, name: payload.name || file.name, sizeBytes: payload.sizeBytes || file.size, contentType: payload.contentType || file.type, url: payload.url });
    options.onSuccess?.(payload, file);
    message.success(checked?.exists ? '秒传成功' : '上传成功');
  } catch (error) {
    options.onError?.(error);
    message.error(uploadErrorMessage(error));
  } finally {
    attachmentUploading.value = false;
  }
}

function resetEditForm() {
  editForm.title = '';
  editForm.content = '';
  editForm.desc = '';
  editForm.reward = '';
  editForm.location = '';
  editForm.categoryId = defaultMallCategoryId();
  editForm.price = '';
  editForm.unit = '元';
  editForm.wechatContact = '';
  editForm.phoneContact = '';
  editForm.phoneIsWechat = false;
  editForm.legacyContact = '';
  editForm.locationName = '';
  editForm.locationAddress = '';
  editForm.latitude = '';
  editForm.longitude = '';
  editForm.visibility = 'ONLINE';
  editForm.pinned = false;
  editForm.postType = 'NORMAL';
  editForm.validUntil = '';
  editForm.imagesText = '';
  editForm.videosText = '';
  editForm.mainImagesText = '';
  editForm.subImagesText = '';
  editForm.attachments = [];
  editingId.value = null;
  editMediaSnapshot.imagesText = '';
  editMediaSnapshot.videosText = '';
  editMediaSnapshot.mainImagesText = '';
  editMediaSnapshot.subImagesText = '';
}

function openCreate() {
  resetEditForm();
  editMode.value = 'create';
  editOpen.value = true;
}

function openCreateAnnouncement() {
  openCreate();
  editForm.postType = 'ANNOUNCEMENT';
  editForm.pinned = true;
  editForm.validUntil = defaultAnnouncementValidUntil();
}

async function openEdit(record: ContentItem) {
  resetEditForm();
  editMode.value = 'edit';
  editingId.value = record.id;
  editOpen.value = true;
  editDetailLoading.value = true;
  try {
    const d = await getContentDetail(type.value, record.id);
    editForm.title = String(d.title || '');
    editForm.content = String(d.content || '');
    editForm.desc = String(d.desc || '');
    editForm.reward = d.reward != null ? String(d.reward) : '';
    editForm.location =
      typeof d.location === 'string' ? d.location : d.location != null ? JSON.stringify(d.location) : '';
    editForm.categoryId = String(d.categoryId || defaultMallCategoryId());
    editForm.price = d.price != null ? String(d.price) : '';
    editForm.unit = String(d.unit || '元');
    editForm.wechatContact = String(d.wechatContact || '');
    editForm.phoneContact = String(d.phoneContact || '');
    editForm.phoneIsWechat = Boolean(d.phoneIsWechat);
    editForm.legacyContact = !d.wechatContact && !d.phoneContact ? String(d.contact || '') : '';
    editForm.locationName = String(d.locationName || '');
    editForm.locationAddress = String(d.locationAddress || '');
    editForm.latitude = d.latitude != null ? String(d.latitude) : '';
    editForm.longitude = d.longitude != null ? String(d.longitude) : '';
    editForm.visibility = d.visibility === 'OFFLINE' ? 'OFFLINE' : 'ONLINE';
    editForm.pinned = Boolean(d.pinned);
    editForm.postType = d.postType === 'ANNOUNCEMENT' ? 'ANNOUNCEMENT' : 'NORMAL';
    editForm.validUntil = toDatetimeLocalValue(d.validUntil);
    if (type.value === 'items') {
      const main = normArray(d.mainImages);
      const sub = normArray(d.subImages);
      const legacy = normArray(d.images);
      editForm.mainImagesText = urlsToLines(main.length ? main : legacy.slice(0, 1));
      editForm.subImagesText = urlsToLines(sub.length ? sub : legacy.slice(1));
    } else {
      editForm.imagesText = urlsToLines(normArray(d.images));
    }
    editForm.videosText = urlsToLines(normArray(d.videos));
    editForm.attachments = normArray(d.attachments).map((item: any) => ({ mediaAssetId: String(item.mediaAssetId || item.id), name: String(item.name || '附件'), sizeBytes: Number(item.sizeBytes || 0), contentType: String(item.contentType || ''), url: item.url }));
    editMediaSnapshot.imagesText = editForm.imagesText;
    editMediaSnapshot.videosText = editForm.videosText;
    editMediaSnapshot.mainImagesText = editForm.mainImagesText;
    editMediaSnapshot.subImagesText = editForm.subImagesText;
  } catch (error) {
    message.error(errorMessage(error));
    editOpen.value = false;
  } finally {
    editDetailLoading.value = false;
  }
}

function buildPayload(): Record<string, unknown> {
  const images = linesToUrls(editForm.imagesText);
  const videos = linesToUrls(editForm.videosText);
  const mainImages = linesToUrls(editForm.mainImagesText);
  const subImages = linesToUrls(editForm.subImagesText);
  const isEdit = editMode.value === 'edit';

  const base: Record<string, unknown> = {
    visibility: editForm.visibility,
    pinned: editForm.pinned,
  };

  if (type.value === 'posts') {
    Object.assign(base, {
      title: editForm.title.trim(),
      content: editForm.content.trim(),
      postType: editForm.postType,
    });
    if (editForm.postType === 'ANNOUNCEMENT') {
      const validUntil = datetimeLocalToIso(editForm.validUntil);
      if (validUntil) base.validUntil = validUntil;
    }
    if (!isEdit || editForm.imagesText !== editMediaSnapshot.imagesText) base.images = images;
    if (!isEdit || editForm.videosText !== editMediaSnapshot.videosText) base.videos = videos;
    base.attachments = editForm.attachments.map((item) => ({ mediaAssetId: item.mediaAssetId }));
    return base;
  }
  if (type.value === 'items') {
    const legacy = [...mainImages, ...subImages];
    Object.assign(base, {
      categoryId: editForm.categoryId,
      title: editForm.title.trim(),
      desc: editForm.desc.trim(),
      price: editForm.price.trim() || undefined,
      unit: editForm.unit.trim() || '元',
      wechatContact: editForm.wechatContact.trim() || null,
      phoneContact: editForm.phoneContact.trim() || null,
      phoneIsWechat: Boolean(editForm.phoneIsWechat),
      locationName: editForm.locationName.trim() || undefined,
      locationAddress: editForm.locationAddress.trim() || undefined,
      latitude: optionalNumber(editForm.latitude),
      longitude: optionalNumber(editForm.longitude),
    });
    const mediaTouched =
      !isEdit ||
      editForm.mainImagesText !== editMediaSnapshot.mainImagesText ||
      editForm.subImagesText !== editMediaSnapshot.subImagesText;
    if (mediaTouched) {
      base.mainImages = mainImages;
      base.subImages = subImages;
      if (legacy.length) base.images = legacy;
    }
    if (!isEdit || editForm.videosText !== editMediaSnapshot.videosText) base.videos = videos;
    return base;
  }
  Object.assign(base, {
    title: editForm.title.trim(),
    desc: editForm.desc.trim(),
    reward: editForm.reward.trim(),
    location: editForm.location.trim(),
  });
  if (!isEdit || editForm.imagesText !== editMediaSnapshot.imagesText) base.images = images;
  if (!isEdit || editForm.videosText !== editMediaSnapshot.videosText) base.videos = videos;
  return base;
}

async function submitEdit() {
  if (attachmentUploading.value) {
    message.warning('附件上传中，请等待上传完成后再保存');
    return Promise.reject();
  }
  const payload = buildPayload();
  if (type.value === 'posts') {
    if (!editForm.title.trim()) {
      message.warning('请填写标题');
      return Promise.reject();
    }
    if (editForm.postType === 'ANNOUNCEMENT') {
      const validUntil = datetimeLocalToIso(editForm.validUntil);
      if (!validUntil) {
        message.warning('请选择公告过期时间');
        return Promise.reject();
      }
      if (new Date(validUntil).getTime() <= Date.now()) {
        message.warning('公告过期时间必须晚于当前时间');
        return Promise.reject();
      }
    }
    const imgs = linesToUrls(editForm.imagesText);
    if (!editForm.content.trim() && imgs.length === 0 && linesToUrls(editForm.videosText).length === 0) {
      message.warning('正文与图片/视频至少填一项');
      return Promise.reject();
    }
  }
  if (type.value === 'items') {
    if (!editForm.title.trim()) {
      message.warning('请填写标题');
      return Promise.reject();
    }
    const wechatContact = editForm.wechatContact.trim();
    const phoneContact = editForm.phoneContact.trim();
    if (!wechatContact && !phoneContact && !editForm.legacyContact.trim()) {
      message.warning('请至少填写微信号或手机号');
      return Promise.reject();
    }
    if (phoneContact && !/^1[3-9]\d{9}$/.test(phoneContact)) {
      message.warning('请输入正确的手机号');
      return Promise.reject();
    }
    const lat = editForm.latitude.trim();
    const lng = editForm.longitude.trim();
    if ((lat || lng) && (!lat || !lng || optionalNumber(lat) === undefined || optionalNumber(lng) === undefined)) {
      message.warning('请填写正确的门店经纬度');
      return Promise.reject();
    }
  }
  if (type.value === 'tasks') {
    if (!editForm.title.trim()) {
      message.warning('请填写标题');
      return Promise.reject();
    }
    if (editMode.value === 'create') {
      if (!editForm.reward.trim()) {
        message.warning('请填写佣金');
        return Promise.reject();
      }
      const imgs = linesToUrls(editForm.imagesText);
      if (!editForm.desc.trim() && imgs.length === 0 && linesToUrls(editForm.videosText).length === 0) {
        message.warning('说明与图片/视频至少填一项');
        return Promise.reject();
      }
    }
  }

  editSaving.value = true;
  try {
    if (editMode.value === 'create') {
      await createContent(type.value, payload);
      message.success('创建成功');
      pagination.current = 1;
    } else if (editingId.value) {
      await updateContent(type.value, editingId.value, payload);
      message.success('已保存');
    }
    editOpen.value = false;
    await load();
  } catch (error) {
    message.error(errorMessage(error));
    return Promise.reject(error);
  } finally {
    editSaving.value = false;
  }
}

function confirmDelete(record: ContentItem) {
  const contentName = record.title?.trim() || record.id;
  Modal.confirm({
    title: `确认删除“${contentName}”？`,
    content: '删除后无法恢复，该操作会记录到操作审计；若商品存在订单将无法删除。',
    okText: '删除',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      await deleteContent(type.value, record.id);
      message.success(`${title.value}“${contentName}”已删除`);
      load();
    },
  });
}

onMounted(async () => {
  await refreshAdmin();
  await loadMallCategories();
  load();
});
onUnmounted(listRequest.dispose);

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

.edit-media-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.edit-media-list--compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.edit-media-item {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  background: #fafafa;
}

.edit-media-item :deep(.ant-image),
.edit-media-item video {
  display: block;
  width: 100%;
  height: 96px;
}

.edit-media-item :deep(.ant-image-img),
.edit-media-item video {
  object-fit: cover;
}

.edit-media-item :deep(.ant-btn) {
  position: absolute;
  right: 6px;
  bottom: 6px;
}

.edit-media-item--video video {
  background: #000;
}

.edit-post-layout {
  display: grid;
  gap: 14px;
}

.edit-section {
  padding: 14px 16px 2px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  background: #fff;
}

.edit-section--settings {
  padding-bottom: 0;
}

.edit-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.edit-section__title {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
  color: rgba(0, 0, 0, 0.88);
}

.edit-section__sub {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.45);
}

.edit-form-grid {
  display: grid;
  gap: 12px 16px;
}

.edit-form-grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.edit-form-grid--settings {
  grid-template-columns: minmax(220px, 1fr) 160px;
  align-items: start;
}

.edit-post-layout :deep(.ant-form-item) {
  margin-bottom: 14px;
}

.edit-post-layout :deep(.ant-radio-group) {
  display: flex;
}

.edit-post-layout :deep(.ant-radio-button-wrapper) {
  flex: 1;
  text-align: center;
}

@media (max-width: 720px) {
  .edit-form-grid--two,
  .edit-form-grid--settings {
    grid-template-columns: 1fr;
  }

  .edit-media-list--compact {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
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
  padding: 24px;
  text-align: center;
  color: rgba(0, 0, 0, 0.45);
  background: rgba(0, 0, 0, 0.02);
  border-radius: 10px;
  font-size: 24px;
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

.forum-attachment-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.forum-attachment-row__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mp-attachments {
  margin-top: 12px;
}

</style>
