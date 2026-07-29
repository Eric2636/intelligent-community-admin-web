export function normalizeAppBase(value?: string): string {
  const segment = String(value || '').trim().replace(/^\/+|\/+$/g, '');
  return segment ? `/${segment}/` : '/';
}

export const appBase = normalizeAppBase(import.meta.env?.BASE_URL);
export const appBaseWithoutTrailingSlash = appBase === '/' ? '' : appBase.slice(0, -1);

export function appPath(path: string): string {
  return `${appBase}${path.replace(/^\/+/, '')}`;
}
