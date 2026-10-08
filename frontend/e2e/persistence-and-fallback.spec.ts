import { expect, test } from '@playwright/test'

test('opens and closes advanced settings without leaving the conversation', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'Session settings' })).toBeVisible()
  await page.getByRole('button', { name: 'Close settings' }).click()
  await expect(page.getByRole('heading', { name: 'Talk with your imaging assistant' })).toBeVisible()
})

test('keeps the conversation available when backend configuration is unavailable', async ({ page }) => {
  await page.route('**/api/config', (route) => route.abort('connectionfailed'))
  await page.goto('/')
  await expect(page.getByText('Backend catalogs are unavailable. Safe fallback options are shown.')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Live conversation' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start voice session' })).toBeEnabled()
})
