import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

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
