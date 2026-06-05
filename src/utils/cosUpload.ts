import { uploadAdminMediaFile } from '../api/admin';
import type { AdminUploadMediaType, AdminUploadModule } from '../api/admin';

const imageExts = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif', 'avif']);
const videoExts = new Set(['mp4', 'mov', 'm4v', 'avi', 'mkv', 'webm', '3gp', 'mpeg', 'mpg', 'flv']);

function extFromFile(file: File) {
  const fromName = /\.(\w+)$/.exec(file.name || '')?.[1]?.toLowerCase();
  if (fromName) return fromName;
  const fromType = (file.type || '').split('/')[1]?.toLowerCase();
  return fromType === 'quicktime' ? 'mov' : fromType || '';
}

function assertAllowed(file: File, mediaType: AdminUploadMediaType) {
  const ext = extFromFile(file);
  const allowed = mediaType === 'vid' ? videoExts : imageExts;
  if (!ext || !allowed.has(ext)) {
    throw new Error(mediaType === 'vid' ? '仅支持上传常见视频格式' : '仅支持上传常见图片格式');
  }
}

export async function uploadAdminMedia(file: File, options: { module: AdminUploadModule; type: AdminUploadMediaType }) {
  assertAllowed(file, options.type);
  const res = await uploadAdminMediaFile(file, options);
  return res.url;
}
