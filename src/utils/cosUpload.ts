import COS from 'cos-js-sdk-v5';
import { getAdminCosCredentials } from '../api/admin';
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

function publicObjectUrl(bucket: string, region: string, key: string) {
  const path = key
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
  return `https://${bucket}.cos.${region}.myqcloud.com/${path}`;
}

function createObjectKey(allowPrefix: string, file: File) {
  const keyPrefix = String(allowPrefix || '').replace(/\*+$/, '');
  if (!keyPrefix || keyPrefix.includes('..')) throw new Error('上传路径无效');
  const ext = extFromFile(file);
  const safeName = (file.name || 'file')
    .replace(/\.[^.]+$/, '')
    .replace(/[^\w-]+/g, '_')
    .slice(0, 32);
  return `${keyPrefix}${Date.now()}_${Math.random().toString(36).slice(2, 10)}_${safeName}.${ext}`;
}

function uploadFile(cos: COS, params: { bucket: string; region: string; key: string; file: File }) {
  return new Promise<void>((resolve, reject) => {
    cos.uploadFile(
      {
        Bucket: params.bucket,
        Region: params.region,
        Key: params.key,
        Body: params.file,
      },
      (err) => {
        if (err) reject(err);
        else resolve();
      },
    );
  });
}

export async function uploadAdminMedia(file: File, options: { module: AdminUploadModule; type: AdminUploadMediaType }) {
  assertAllowed(file, options.type);
  const sts = await getAdminCosCredentials(options);
  const key = createObjectKey(sts.allowPrefix, file);
  const cos = new COS({
    getAuthorization(_, callback) {
      callback({
        TmpSecretId: sts.credentials.tmpSecretId,
        TmpSecretKey: sts.credentials.tmpSecretKey,
        SecurityToken: sts.credentials.sessionToken,
        StartTime: sts.startTime,
        ExpiredTime: sts.expiredTime,
      });
    },
  });
  await uploadFile(cos, { bucket: sts.bucket, region: sts.region, key, file });
  return publicObjectUrl(sts.bucket, sts.region, key);
}
