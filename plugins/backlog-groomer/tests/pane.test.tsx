import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'backlog-groomer',
  component: 'Pane',
  requestId: 'groom-report',
  props: {
    title: 'Grooming',
    isFocused: true,
    bodyColumns: 100,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
  viewport: { columns: 160, rows: 40, isFullscreen: true },
} as const

const REPORT = {
  tool: 'mcp__backlog-groomer__show_report',
  scope: 'Team TheLearningMate',
  tracker: 'Linear',
  scanned: 42,
  staleDays: 60,
  items: [
    { n: 1, issue: 'TLM-42', title: 'Login fails on Safari', bucket: 'Duplicate', action: 'Mark duplicate of TLM-17 + comment', reason: 'Same Safari failure', draft: 'Marking as duplicate of TLM-17.', draftKind: 'Comment' },
    { n: 2, issue: 'TLM-88', title: 'Dark mode', bucket: 'Stale', action: 'Cancel + comment', reason: 'Untouched 143 days', draft: 'Closing as stale: no activity for 143 days.' },
    { n: 3, issue: 'TLM-95', title: 'Add CSV import', bucket: 'Labels', action: '+Feature', reason: 'No category label' },
  ],
} as const

function surfaceStubs(on: On): string[] {
  const sent: string[] = []
  on('ui.open', async () => ({ value: { isPlaced: true } as const }))
  on('ui.toast', async () => ({ value: undefined }))
  on('prompt.submit', async (_$, e) => {
    sent.push(e.text)
    return { text: e.text }
  })
  return sent
}

test('ticked items are applied as one "apply" message from the person', async ($, on) => {
  const sent = surfaceStubs(on)

  const shown = await $.tool.call(REPORT)
  expect(shown.deny).toBeUndefined()

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ key: 'toggle:1' }))?.text).toContain('[ ]')
    await ui.press({ key: 'toggle:1' })
    await ui.press({ key: 'toggle:3' })
    expect((await ui.find({ key: 'toggle:1' }))?.text).toContain('[x]')
    expect((await ui.find({ key: 'apply' }))?.text).toContain('Apply 2 selected')
    await ui.unmount()
    await $.tool.call(REPORT)
  }

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'toggle:1' })
  await ui.press({ key: 'toggle:2' })
  await ui.press({ key: 'toggle:3' })
  await ui.press({ key: 'apply' })
  expect(sent).toEqual(['apply 1-3'])
  expect((await ui.find({ key: 'toggle:2' }))?.text).toContain('[…]')

  await $.tool.call({
    tool: 'mcp__backlog-groomer__mark_results',
    results: [
      { n: 1, status: 'applied' },
      { n: 2, status: 'failed', note: 'rate limited' },
    ],
  })
  expect((await ui.find({ key: 'toggle:1' }))?.text).toContain('[✓]')
  expect((await ui.find({ key: 'toggle:2' }))?.text).toContain('[✗]')
  await ui.unmount()
})

test('apply with nothing ticked sends nothing', async ($, on) => {
  const sent = surfaceStubs(on)
  await $.tool.call(REPORT)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'apply' })
  expect(sent).toEqual([])
  await ui.unmount()
})

test('bucket filter narrows the rows and "Select shown" ticks only those', async ($, on) => {
  const sent = surfaceStubs(on)
  await $.tool.call(REPORT)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'bucket:Stale' })
  expect(await ui.find({ key: 'toggle:1' })).toBeUndefined()
  await ui.press({ key: 'select-all' })
  await ui.press({ key: 'apply' })
  expect(sent).toEqual(['apply 2'])
  await ui.unmount()
})

test('a report with no items is refused', async ($, on) => {
  surfaceStubs(on)
  const shown = await $.tool.call({ ...REPORT, items: [] })
  expect(typeof shown.deny).toBe('string')
})

test('the preview shows the exact text that will be posted for the item in view', async ($, on) => {
  surfaceStubs(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const shown = await $.tool.call(REPORT)
    expect(String(shown.result)).toContain('PANE OPEN')
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ key: 'draft' }))?.text).toContain('Marking as duplicate of TLM-17.')

    await ui.press({ key: 'view:2' })
    expect((await ui.find({ key: 'draft' }))?.text).toContain('Closing as stale')
    expect((await ui.find({ key: 'preview' }))?.text).toContain('Untouched 143 days')

    await ui.press({ key: 'toggle:3' })
    expect(await ui.find({ key: 'draft' })).toBeUndefined()
    expect((await ui.find({ key: 'preview' }))?.text).toContain('Nothing will be posted')
    await ui.unmount()
  }
})

test('without a placed pane the model is told to print the full report', async ($, on) => {
  on('ui.open', async () => ({ value: { isPlaced: false, reason: 'narrow' } as never }))
  const shown = await $.tool.call(REPORT)
  expect(String(shown.result)).toContain('PANE NOT SHOWN')
})
