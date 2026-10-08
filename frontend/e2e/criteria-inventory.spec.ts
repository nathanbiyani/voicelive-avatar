import { expect, test } from '@playwright/test'

test('keeps the workbook matrix hidden and centers the live conversation', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Talk with your imaging assistant' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Live conversation' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'All 47 evaluation criteria' })).toHaveCount(0)
  await expect(page.locator('.criteria-table')).toHaveCount(0)
  await expect(page.locator('.stage')).toHaveCSS('height', '600px')
})
