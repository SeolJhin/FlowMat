import { expect, test } from '@playwright/test'
import { answerAuth, mockedLogin, ok } from './support/mockApi'

/**
 * A work instruction step that takes its limits from an inspection standard (docs/domain/work-instruction.md W13-W15)
 * against a mocked API: the draft offers the product's production standards, sends the standard instead of limits, and
 * says when a followed standard's limits changed.
 */
test('a step follows an inspection standard instead of typing its limits', async ({ page }) => {
  const step = (stepId: string, stepNo: number, text: string, standardStatus: 'current' | 'changed', valueMax: number) => ({
    stepId, stepNo, text, required: true, recordsValue: true, valueLabel: 'Moisture %', valueMin: 10, valueMax,
    standardId: 's-moisture', standardName: 'Moisture', standardStatus,
  })
  const instruction = {
    instructionId: 'wi-bread', projectId: 'prj-e2e', itemId: 'bread', itemCode: 'BREAD', itemName: 'bread', revisionNo: 1,
    status: 'draft', title: 'Baking bread', body: null, documentUrl: null, releasedBy: null, releasedAt: null,
    updatedAt: '2026-10-11T00:00:00Z', blocksFinish: false, steps: [step('st-1', 1, 'Check the dough', 'changed', 12)],
  }
  const standard = (standardId: string, inspectionType: string, stage: string, standardMin: number | null, standardMax: number | null) => ({
    standardId, projectId: 'prj-e2e', itemId: 'bread', itemCode: 'BREAD', itemName: 'bread', inspectionType, stage, standardMin,
    standardMax, unit: '%', required: false, active: true, note: null,
  })
  const sent: unknown[] = []

  await page.route(/^https?:\/\/[^/]+\/api\//, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (await answerAuth(route, pathname)) return
    if (request.method() === 'POST' && pathname === '/api/work-instructions/wi-bread/steps') {
      sent.push(request.postDataJSON())
      instruction.steps = [...instruction.steps, step('st-2', 2, 'Weigh the loaves', 'current', 13)]
      return ok(route, instruction)
    }
    if (request.method() !== 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ success: false, data: null, message: `Unmocked ${request.method()} ${pathname}` }) })
    }
    if (pathname === '/api/items') {
      return ok(route, [{ itemId: 'bread', projectId: 'prj-e2e', itemCode: 'BREAD', itemName: 'bread', itemType: 'product',
        resourceCategory: null, resourceType: null, unitId: 'unit_ea', itemStatus: 'active', lotManageYn: 'N', unitCost: null }])
    }
    if (pathname === '/api/work-instructions') return ok(route, [instruction])
    if (pathname === '/api/inspection-standards') {
      return ok(route, [standard('s-moisture', 'Moisture', 'production', 10, 13), standard('s-seal', 'Seal', 'receipt', null, null)])
    }
    return ok(route, [])
  })

  await mockedLogin(page)
  await page.goto('/projects/prj-e2e/inventory?tab=instructions')
  await page.getByRole('combobox', { name: 'Product', exact: true }).selectOption('bread', { timeout: 15_000 })
  const detail = page.getByRole('region', { name: 'Instruction' })
  const steps = detail.getByRole('list', { name: 'Steps' })
  // The standard moved to 10–13 after the step took 10–12: the draft takes it when released (W14-W15).
  await expect(steps.getByRole('listitem').first()).toContainText('records Moisture % (10–12) · follows Moisture')
  await expect(steps.getByRole('note')).toHaveText('The limits of the Moisture standard changed; releasing takes them.')

  const add = detail.getByRole('form', { name: 'Add step' })
  await add.getByLabel('Step').fill('Weigh the loaves')
  await add.getByLabel('Records a value').check()
  const limitsFrom = add.getByLabel('Limits from')
  // Receipt standards are for incoming LOTs, so only Moisture is offered.
  await expect(limitsFrom.getByRole('option')).toHaveText(['(typed here)', 'Moisture · 10–13 %'])
  await limitsFrom.selectOption('s-moisture')
  await expect(add.getByLabel('Min')).toHaveCount(0)
  await expect(add.getByLabel('Value label')).toHaveAttribute('placeholder', 'Moisture %')
  await add.getByRole('button', { name: 'Add step' }).click()
  await expect(steps.getByRole('listitem')).toHaveCount(2)
  await expect(steps.getByRole('listitem').nth(1)).toContainText('records Moisture % (10–13) · follows Moisture')
  expect(sent).toEqual([{ text: 'Weigh the loaves', required: true, recordsValue: true, valueLabel: null, standardId: 's-moisture' }])
})
