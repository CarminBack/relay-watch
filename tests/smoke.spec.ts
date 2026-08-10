import { expect, test } from '@playwright/test'

test('shows the public fields and supports evidence expansion', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/中转站验真台/)
  await expect(page.getByRole('heading', { name: '演示记录（非真实曝光）' })).toBeVisible()
  await expect(page.getByRole('link', { name: /网站 example\.com/ })).toHaveAttribute('href', 'https://example.com')
  await expect(page.getByRole('link', { name: /TG @example/ })).toHaveAttribute('href', 'https://t.me/example')

  await page.getByRole('button', { name: '证据清单' }).click()
  await expect(page.getByRole('region', { name: '证据清单' })).toBeVisible()
  await expect(page.getByText('原始响应与时间戳')).toBeVisible()
})

test('filters records and recovers from an empty state', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: '确认掺水' }).click()
  await expect(page.getByRole('heading', { name: '没有匹配的记录' })).toBeVisible()

  await page.getByRole('button', { name: '清除筛选' }).click()
  await expect(page.getByRole('heading', { name: '演示记录（非真实曝光）' })).toBeVisible()

  await page.getByRole('searchbox').fill('不存在的站点')
  await expect(page.getByRole('heading', { name: '没有匹配的记录' })).toBeVisible()
})

test('does not overflow the viewport', async ({ page }) => {
  await page.goto('/')
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(hasOverflow).toBe(false)
})
