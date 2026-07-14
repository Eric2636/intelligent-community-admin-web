/** 将 ISO 等时间串格式化为本地时间的 yyyy年MM月DD日 HH:mm（不显示秒、时区后缀）；空或无效为 '-' */
export function formatDateTimeYmdHm(value: string | undefined | null): string {
  if (value == null || String(value).trim() === '') return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}年${m}月${day}日 ${hh}:${mm}`;
}
