# Test Admin Subpath Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the test admin console at `https://lllhjh.asia/test-admin/` without exposing port 3001 or routing any test-admin request to production APIs.

**Architecture:** A shared base-path helper normalizes the Vite build base, Vue Router history base, Axios base URL, and login redirect. The test Docker image is built with `/test-admin/`; the public gateway strips that prefix before forwarding to the existing test-web container, whose internal Nginx continues to proxy `/api/` to `api-test:3000`.

**Tech Stack:** Vue 3, Vue Router, Vite, TypeScript, Axios, Node test runner, Docker, Nginx

---

### Task 1: Add failing deployment-path tests

**Files:**
- Modify: `test/deployment-config.spec.mjs`

- [ ] **Step 1: Add tests for the required contracts**

Add assertions that:

```js
assert.match(viteConfig, /base:\s*normalizeAppBase\(env\.VITE_APP_BASE\)/)
assert.match(router, /createWebHistory\(import\.meta\.env\.BASE_URL\)/)
assert.match(adminApi, /baseURL:\s*appBaseWithoutTrailingSlash/)
assert.match(adminApi, /location\.href\s*=\s*appPath\('\/login'\)/)
assert.match(dockerfile, /ARG VITE_APP_BASE=\//)
assert.match(dockerfile, /ENV VITE_APP_BASE=\$\{VITE_APP_BASE\}/)
```

Add executable helper tests covering `/`, `test-admin`, `/test-admin`, and `/test-admin/`.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test test/deployment-config.spec.mjs
```

Expected: failure because the base-path helper and configuration are not implemented.

### Task 2: Implement shared base-path behavior

**Files:**
- Create: `src/config/app-base.ts`
- Modify: `vite.config.ts`
- Modify: `src/router/index.ts`
- Modify: `src/api/admin.ts`
- Modify: `Dockerfile`

- [ ] **Step 1: Create the shared helper**

Implement:

```ts
export function normalizeAppBase(value?: string): string {
  const segment = String(value || '').trim().replace(/^\/+|\/+$/g, '');
  return segment ? `/${segment}/` : '/';
}

export const appBase = normalizeAppBase(import.meta.env.BASE_URL);
export const appBaseWithoutTrailingSlash = appBase === '/' ? '' : appBase.slice(0, -1);

export function appPath(path: string): string {
  return `${appBase}${path.replace(/^\/+/, '')}`;
}
```

- [ ] **Step 2: Wire the helper into build and runtime**

Use `normalizeAppBase(env.VITE_APP_BASE)` as Vite's `base`, use `import.meta.env.BASE_URL` as the Vue Router history base, use `appBaseWithoutTrailingSlash` for both Axios instances, and use `appPath('/login')` for the forced login redirect.

- [ ] **Step 3: Add the Docker build argument**

Add before `RUN npm run build`:

```dockerfile
ARG VITE_APP_BASE=/
ENV VITE_APP_BASE=${VITE_APP_BASE}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
node --test test/deployment-config.spec.mjs
```

Expected: all deployment configuration tests pass.

### Task 3: Verify both production and test builds

**Files:**
- No additional files

- [ ] **Step 1: Run the full test suite**

Run:

```bash
node --test test/*.spec.mjs
```

Expected: zero failures.

- [ ] **Step 2: Run the default production build**

Run:

```bash
npm run build
```

Expected: build succeeds and generated asset URLs start with `/assets/`.

- [ ] **Step 3: Run the test-subpath build**

Run:

```bash
VITE_APP_BASE=/test-admin/ npm run build
```

Expected: build succeeds and generated asset URLs start with `/test-admin/assets/`.

### Task 4: Promote the approved change to test

**Files:**
- Commit all files from Tasks 1–3 plus the approved design and this plan

- [ ] **Step 1: Commit on `dev`**

```bash
git add Dockerfile vite.config.ts src/config/app-base.ts src/router/index.ts src/api/admin.ts test/deployment-config.spec.mjs docs/superpowers/specs/2026-07-29-test-admin-subpath-design.md docs/superpowers/plans/2026-07-29-test-admin-subpath.md
git commit -m "feat(deploy): support test admin subpath"
git push origin dev
```

- [ ] **Step 2: Promote to `test`**

```bash
git switch test
git merge --no-ff dev
git push origin test
```

Expected: merge completes without business-code conflicts.

### Task 5: Deploy test web and gateway

**Files:**
- Server: `/home/ubuntu/docker-project/gateway/lllhjh-api.conf`
- Server: `/home/ubuntu/docker-project/intelligent-community-admin-web/`

- [ ] **Step 1: Sync the verified `test` source**

Use the local-direct-deploy process to synchronize the checked-out `test` branch to the server while excluding `.git`, dependencies, build output, and environment files.

- [ ] **Step 2: Build and recreate the test web**

Build with:

```bash
docker build --build-arg VITE_APP_BASE=/test-admin/ -t ic-admin-web-test:latest .
```

Recreate `ic-test-admin-web` on `deploy_default` with `ADMIN_API_UPSTREAM=api-test:3000` and the existing `3001:80` mapping. Verify locally on the server before changing the gateway.

- [ ] **Step 3: Back up and update the gateway**

Add:

```nginx
upstream admin_web_test {
    server ic-test-admin-web:80;
}

location = /test-admin {
    return 301 /test-admin/;
}

location /test-admin/ {
    proxy_pass http://admin_web_test/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
}
```

Run `nginx -t` inside `ic-domain-api-gateway`, then reload Nginx only after the check passes.

### Task 6: Verify isolation and production regression

**Files:**
- No additional files

- [ ] **Step 1: Verify public test routes**

Check:

```bash
curl -fsSI https://lllhjh.asia/test-admin/
curl -fsS https://lllhjh.asia/test-admin/api/health
```

Expected: the first returns the test build and the second returns `{"ok":true}` from the test API.

- [ ] **Step 2: Verify production routes**

Check:

```bash
curl -fsSI https://lllhjh.asia/
curl -fsS https://lllhjh.asia/api/health
```

Expected: both production endpoints remain healthy.

- [ ] **Step 3: Verify container and gateway state**

Confirm `ic-test-admin-web`, `ic-test-admin-api`, `ic-admin-web`, `ic-admin-api`, and `ic-domain-api-gateway` are running, and confirm the test page references `/test-admin/assets/`.
