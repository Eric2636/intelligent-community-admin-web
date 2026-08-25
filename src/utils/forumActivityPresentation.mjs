const labels = { CONTENT: '内容', REGISTRATION: '活动报名' };

export function forumActivityPresentation(record, now = new Date()) {
  const featureType = String(record?.featureType || 'CONTENT');
  const label = labels[featureType] || featureType;
  if (featureType !== 'REGISTRATION' || !record?.registration) return { label, registration: null };
  const registration = record.registration;
  const deadlineAt = String(registration.deadlineAt || '');
  const registeredCount = Number(registration.registeredCount || 0);
  const capacity = Number(registration.capacity || 0);
  const status = new Date(deadlineAt).getTime() <= now.getTime() ? '已截止' : registeredCount >= capacity ? '已满' : '报名中';
  return { label, registration: { registeredCount, capacity, deadlineAt, status } };
}
