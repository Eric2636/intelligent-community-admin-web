# Readable User Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove unnecessary user-ID exposure from admin workflows while preserving ID-based storage, permissions, and audit data.

**Architecture:** The backend resolves stored actor IDs to user names/admin usernames at query time. The Vue application renders those display fields and continues submitting internal IDs only from controlled selections or the current administrator binding.

**Tech Stack:** TypeScript, Koa, Prisma, Vue 3, Ant Design Vue, Node test runner.

---

### Task 1: Resolve readable identities in backend log queries

**Files:**
- Modify: `intelligent-community-admin/src/modules/client-log/client-log.service.ts`
- Modify: `intelligent-community-admin/src/modules/api-log/api-log.service.ts`
- Test: `intelligent-community-admin/test/client-log.service.spec.ts`
- Test: `intelligent-community-admin/test/api-log.service.spec.ts`

- [ ] Write failing tests proving mini-program error logs return `userName` and that actor-keyword filtering resolves a nickname or administrator account into the associated stored IDs.
- [ ] Run the two focused tests and confirm they fail because display-name resolution and actor keyword filtering are absent.
- [ ] Add batched user-name lookup for mini-program error logs and resolve API-monitor actor keywords before building the log query; retain direct ID matching for technical compatibility.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Remove ID-first controls from the Vue admin interface

**Files:**
- Modify: `intelligent-community-admin-web/src/views/AdminsView.vue`
- Modify: `intelligent-community-admin-web/src/views/MiniApiErrorLogsView.vue`
- Modify: `intelligent-community-admin-web/src/views/ApiAccessLogsView.vue`
- Modify: `intelligent-community-admin-web/src/views/ContentView.vue`
- Modify: `intelligent-community-admin-web/src/api/admin.ts`
- Modify: `intelligent-community-admin-web/src/types/api.ts`

- [ ] Add failing source-level regression checks covering nickname-only binding choices, user-name error-log columns, readable actor filtering, and no editable publish-user-ID control.
- [ ] Run the regression check and confirm it fails against the current UI text and fields.
- [ ] Render nickname-only binding choices; consume returned user names in the error log; rename the actor filter to “用户/管理员”; remove the direct actor-user-ID form control and rely on the current bound user for non-announcement content.
- [ ] Run the regression check and confirm it passes.

### Task 3: Verify the integrated change

**Files:**
- Modify: `intelligent-community-admin-web/docs/superpowers/specs/2026-08-08-readable-user-identity-design.md`
- Modify: `intelligent-community-admin-web/docs/superpowers/plans/2026-08-08-readable-user-identity.md`

- [ ] Run backend focused tests, full backend tests, backend build, admin-web regression checks, and admin-web build.
- [ ] Review the diffs against the scope: no schema/migration changes, no ID displayed in the specified operator-facing controls, no permission relaxation.
- [ ] Commit verified changes on each repository's `dev` branch; do not merge or deploy without explicit user authorization.
