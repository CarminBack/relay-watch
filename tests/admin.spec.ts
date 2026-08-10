import { expect, test } from '@playwright/test'

const demoRecord = {
  id: 'demo-record',
  name: '演示记录（非真实曝光）',
  website: 'https://example.com',
  domain: 'example.com',
  telegram: 'https://t.me/example',
  telegramHandle: '@example',
  status: 'demo',
  statusLabel: '演示数据',
  updatedAt: '2026-08-10',
  summary: '演示摘要',
  claim: '演示承诺',
  observed: '演示结果',
  sampleSize: null,
  tags: ['示例'],
  evidence: ['演示证据'],
  visibility: 'published',
  createdAt: '2026-08-10 00:00:00',
  modifiedAt: '2026-08-10 00:00:00',
}

async function mockAdminApi(page: import('@playwright/test').Page) {
  await page.route('**/admin/api/records', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ records: [demoRecord], actorEmail: 'excut164@gmail.com' }) })
      return
    }
    const body = JSON.parse(route.request().postData() ?? '{}')
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ record: { ...demoRecord, ...body, id: 'new-record' } }) })
  })
  await page.route('**/admin/api/records/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ deleted: true }) })
      return
    }
    const body = JSON.parse(route.request().postData() ?? '{}')
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ record: { ...demoRecord, ...body } }) })
  })
}

test('admin editor loads records and submits a published record', async ({ page }, testInfo) => {
  await mockAdminApi(page)
  await page.goto('/admin')

  await expect(page.getByRole('heading', { name: '核验记录管理' })).toBeVisible()
  await expect(page.getByText('excut164@gmail.com')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('admin.png'), fullPage: true })
  await page.getByRole('button', { name: /新建/ }).click()
  await page.getByLabel('站点名称 *').fill('新测试站')
  await page.getByLabel('网站地址 *').fill('https://new.example.com')
  await page.getByLabel('Telegram 频道 *').fill('https://t.me/new_test')
  await page.getByLabel('结论摘要 *').fill('多轮测试摘要')
  await page.getByLabel('公开承诺 *').fill('公开承诺')
  await page.getByLabel('实测结果 *').fill('实测结果')
  await page.getByLabel('证据清单').fill('带时间戳的原始响应')
  await page.getByRole('button', { name: '发布', exact: true }).click()
  await page.getByRole('button', { name: '保存记录' }).click()
  await expect(page.getByRole('status')).toContainText('记录已保存并公开')
})

test('admin layout does not overflow on mobile', async ({ page }) => {
  await mockAdminApi(page)
  await page.goto('/admin')
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(hasOverflow).toBe(false)
})
