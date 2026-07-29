import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import ts from 'typescript'

const projectRoot = path.resolve(import.meta.dirname, '..')

async function importTranspiledTypeScript(relativePath) {
  const filePath = path.join(projectRoot, relativePath)
  const source = await readFile(filePath, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filePath,
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}#${Date.now()}`)
}

test('admin web container selects its API upstream through an environment variable', async () => {
  const [dockerfile, template] = await Promise.all([
    readFile(new URL('../Dockerfile', import.meta.url), 'utf8'),
    readFile(new URL('../nginx.conf.template', import.meta.url), 'utf8'),
  ])

  assert.match(dockerfile, /ENV ADMIN_API_UPSTREAM=ic-admin-api:3000/)
  assert.match(
    dockerfile,
    /COPY nginx\.conf\.template \/etc\/nginx\/templates\/default\.conf\.template/,
  )
  assert.match(template, /server \$\{ADMIN_API_UPSTREAM\};/)
  assert.doesNotMatch(template, /server ic-admin-api:3000;/)
})

test('admin web uses one configurable base path across build, routing, API and redirects', async () => {
  const [viteConfig, router, adminApi, dockerfile] = await Promise.all([
    readFile(new URL('../vite.config.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/router/index.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/api/admin.ts', import.meta.url), 'utf8'),
    readFile(new URL('../Dockerfile', import.meta.url), 'utf8'),
  ])

  assert.match(viteConfig, /base:\s*normalizeAppBase\(env\.VITE_APP_BASE\)/)
  assert.match(router, /createWebHistory\(import\.meta\.env\.BASE_URL\)/)
  assert.match(adminApi, /baseURL:\s*appBaseWithoutTrailingSlash/)
  assert.match(adminApi, /location\.href\s*=\s*appPath\('\/login'\)/)
  assert.match(dockerfile, /ARG VITE_APP_BASE=\//)
  assert.match(dockerfile, /ENV VITE_APP_BASE=\$\{VITE_APP_BASE\}/)
})

test('application base paths are normalized and joined consistently', async () => {
  const { normalizeAppBase, appPath } = await importTranspiledTypeScript('src/config/app-base.ts')

  assert.equal(normalizeAppBase(), '/')
  assert.equal(normalizeAppBase('/'), '/')
  assert.equal(normalizeAppBase('test-admin'), '/test-admin/')
  assert.equal(normalizeAppBase('/test-admin'), '/test-admin/')
  assert.equal(normalizeAppBase('/test-admin/'), '/test-admin/')
  assert.equal(appPath('/login'), '/login')
})
