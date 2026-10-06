import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const PANE = {
  plugin: 'sherlog',
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
  tool: 'mcp__sherlog__show_report',
  scope: 'Team TheLearningMate',
  tracker: 'Linear',
  scanned: 42,
  staleDays: 60,
  items: [
    { n: 1, issue: 'TLM-42', title: 'Login fails on Safari', bucket: 'Duplicate', action: 'Mark duplicate of TLM-17 + comment', reason: 'Same Safari failure', url: 'https://linear.app/tlm/issue/TLM-42', draft: 'Marking as duplicate of TLM-17.', draftKind: 'Comment' },
    { n: 2, issue: 'TLM-88', title: 'Dark mode', bucket: 'Stale', action: 'Cancel + comment', reason: 'Untouched 143 days', priority: 2, draft: 'Closing as stale: no activity for 143 days.' },
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
    tool: 'mcp__sherlog__mark_results',
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

test('a row expands in place to show the exact text it will post, one at a time', async ($, on) => {
  surfaceStubs(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const shown = await $.tool.call(REPORT)
    expect(String(shown.result)).toContain('PANE OPEN')
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ key: 'details:1' })).toBeUndefined()

    await ui.press({ key: 'view:2' })
    expect((await ui.find({ key: 'draft:2' }))?.text).toContain('Closing as stale')
    expect((await ui.find({ key: 'details:2' }))?.text).toContain('Untouched 143 days')
    expect((await ui.find({ key: 'details:2' }))?.text).toContain('High')

    await ui.press({ key: 'view:2' })
    expect(await ui.find({ key: 'details:2' })).toBeUndefined()

    await ui.press({ key: 'toggle:1' })
    expect((await ui.find({ key: 'draft:1' }))?.text).toContain('Marking as duplicate of TLM-17.')
    expect((await ui.find({ key: 'link:1' }))?.text).toContain('Open in Linear')

    await ui.press({ key: 'view:3' })
    expect(await ui.find({ key: 'details:1' })).toBeUndefined()
    expect((await ui.find({ key: 'details:3' }))?.text).toContain('Nothing will be posted')
    await ui.unmount()
  }
})

test('long drafts are cut to ten lines until "Show all" is pressed', async ($, on) => {
  surfaceStubs(on)
  const long = Array.from({ length: 14 }, (_, i) => `line ${i + 1}`).join('\n')
  await $.tool.call({
    ...REPORT,
    items: [{ n: 1, issue: 'TLM-1', title: 'Fix export', bucket: 'Vague', action: 'Rewrite description', reason: 'No repro', draft: long, draftKind: 'New description' }],
  })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'view:1' })
  expect((await ui.find({ key: 'draft:1' }))?.text).not.toContain('line 11')
  expect((await ui.find({ key: 'more:1' }))?.text).toContain('4 more lines')
  await ui.press({ key: 'more:1' })
  expect((await ui.find({ key: 'draft:1' }))?.text).toContain('line 14')
  await ui.unmount()
})

test('without a placed pane the model is told to print the full report', async ($, on) => {
  on('ui.open', async () => ({ value: { isPlaced: false, reason: 'narrow' } as never }))
  const shown = await $.tool.call(REPORT)
  expect(String(shown.result)).toContain('PANE NOT SHOWN')
})

const BAND = {
  plugin: 'sherlog',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 6,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 6 },
    view: {},
  },
  viewport: { columns: 120, rows: 40 },
} as const

async function hidePane($: Engine) {
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await pane.press({ key: 'close' })
  await pane.unmount()
}

test('a closed pane leaves a band above the prompt that brings it back', async ($, on) => {
  surfaceStubs(on)
  on('ui.close', async () => ({ value: undefined }))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>prompt</Text>
  })
  await $.tool.call(REPORT)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface } as never)
    expect(await ui.find({ key: 'band-show' })).toBeUndefined()

    await hidePane($)
    expect(await ui.find({ key: 'band-show' })).toBeDefined()

    await ui.press({ key: 'band-show' })
    expect(await ui.find({ key: 'band-show' })).toBeUndefined()
    await ui.unmount()
  }
})

test('Dismiss hides the band until the next report', async ($, on) => {
  surfaceStubs(on)
  on('ui.close', async () => ({ value: undefined }))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>prompt</Text>
  })
  await $.tool.call(REPORT)
  await hidePane($)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
  await ui.press({ key: 'band-dismiss' })
  expect(await ui.find({ key: 'band-show' })).toBeUndefined()

  await $.tool.call(REPORT)
  await hidePane($)
  expect(await ui.find({ key: 'band-show' })).toBeDefined()
  await ui.unmount()
})
