import { expect, test } from '@playwright/test'

test('loads backend catalogs and applies the complex-name evaluation preset', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByText('Backend connection & target').click()
  await expect(page.getByText('Backend ready', { exact: true })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Model', exact: true })).toHaveValue('gpt-realtime')

  await page.getByRole('button', { name: 'Apply Complex names preset' }).click()
  await page.getByText('Evaluation language packs').click()
  await expect(page.getByLabel('Synthetic complex-name pack')).toHaveValue('multicultural-names-v1')

  await page.getByLabel('Accent & recognition locale').selectOption('en-IN')
  await page.getByRole('button', { name: 'Close settings' }).click()
  await expect(page.getByLabel('Active session profile').getByText('English (India)', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start voice session' })).toBeEnabled()
})
