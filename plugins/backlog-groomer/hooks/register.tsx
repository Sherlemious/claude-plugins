import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { GroomItem, GroomReport, GroomResult, GroomResultStatus } from '../types'

const PLUGIN = 'backlog-groomer'
const PANE = 'groom-report'
const MAX_BATCH = 25

const report = atom({ plugin: 'backlog-groomer', key: 'report' } as const, null)
const selected = atom({ plugin: 'backlog-groomer', key: 'selected' } as const, [])
const results = atom({ plugin: 'backlog-groomer', key: 'results' } as const, {})
const bucket = atom({ plugin: 'backlog-groomer', key: 'bucket' } as const, 'all')

const STATUSES: readonly GroomResultStatus[] = ['pending', 'applied', 'failed', 'skipped']

const SHOW_SCHEMA = {
  type: 'object',
  properties: {
    scope: { type: 'string', description: 'What was groomed, e.g. "Team TheLearningMate"' },
    tracker: { type: 'string', description: 'e.g. "Linear"' },
    scanned: { type: 'number', description: 'Open issues scanned' },
    staleDays: { type: 'number' },
    skipped: { type: 'string', description: 'Skipped buckets and why, or omit' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          n: { type: 'number', description: 'Item number, same as the markdown report' },
          issue: { type: 'string', description: 'Human identifier, e.g. TLM-42' },
          url: { type: 'string' },
          title: { type: 'string' },
          bucket: { type: 'string', description: 'Duplicate, Related, Stale, Vague, Labels, Priority, Estimate, Orphaned' },
          action: { type: 'string', description: 'Short literal action, e.g. "Cancel + comment"' },
          reason: { type: 'string' },
        },
        required: ['n', 'issue', 'title', 'bucket', 'action', 'reason'],
      },
    },
  },
  required: ['scope', 'tracker', 'scanned', 'items'],
}

const MARK_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          n: { type: 'number' },
          status: { type: 'string', enum: ['applied', 'failed', 'skipped'] },
          note: { type: 'string' },
        },
        required: ['n', 'status'],
      },
    },
  },
  required: ['results'],
}

function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function parseItems(value: unknown): GroomItem[] {
  if (!Array.isArray(value)) return []
  const items: GroomItem[] = []
  for (const raw of value) {
    if (raw === null || typeof raw !== 'object') continue
    const one = raw as Record<string, unknown>
    if (typeof one.n !== 'number') continue
    items.push({
      n: one.n,
      issue: asText(one.issue, '?'),
      url: typeof one.url === 'string' ? one.url : undefined,
      title: asText(one.title),
      bucket: asText(one.bucket, 'Other'),
      action: asText(one.action),
      reason: asText(one.reason),
    })
  }
  return items.sort((a, b) => a.n - b.n)
}

/** [1,2,3,5,7,8] -> "1-3, 5, 7-8" */
export function compressRanges(numbers: readonly number[]): string {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b)
  const runs: [number, number][] = []
  for (const n of sorted) {
    const last = runs[runs.length - 1]
    if (last !== undefined && n === last[1] + 1) last[1] = n
    else runs.push([n, n])
  }
  return runs.map(([from, to]) => (from === to ? `${from}` : `${from}-${to}`)).join(', ')
}

function bucketsOf(items: readonly GroomItem[]): string[] {
  return [...new Set(items.map(item => item.bucket))]
}

function mark(result: GroomResult | undefined, isSelected: boolean): string {
  switch (result?.status) {
    case 'pending':
      return '[…]'
    case 'applied':
      return '[✓]'
    case 'failed':
      return '[✗]'
    case 'skipped':
      return '[-]'
    default:
      return isSelected ? '[x]' : '[ ]'
  }
}

async function openPane($: EngineInterface, focus: boolean) {
  const shown = await read($, report)
  const title = shown === null ? 'Backlog grooming' : `Grooming: ${shown.scope}`
  return $.ui.open(focus ? { id: PANE, title, focus: true } : { id: PANE, title })
}

async function apply($: EngineInterface) {
  const shown = await read($, report)
  const done = await read($, results)
  const picked = (await read($, selected)).filter(n => done[String(n)] === undefined)
  if (shown === null || picked.length === 0) {
    $.ui.toast('Select at least one item to apply.')
    return
  }
  const batch = [...picked].sort((a, b) => a - b).slice(0, MAX_BATCH)
  if (picked.length > MAX_BATCH) {
    $.ui.toast(`Applying the first ${MAX_BATCH}; batches are capped.`)
  }
  await update($, results, current => {
    const next = { ...current }
    for (const n of batch) next[String(n)] = { status: 'pending' }
    return next
  })
  await update($, selected, current => current.filter(n => !batch.includes(n)))
  await $.prompt.submit({ text: `apply ${compressRanges(batch)}`, asUser: true })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'show_report',
      description:
        'Shows a backlog grooming report as an interactive checklist pane. Call it once per report, after printing the markdown report, with the same numbered items. The person ticks items and presses Apply, which sends "apply <numbers>" as their message. Read-only: it changes nothing in the tracker.',
      inputSchema: SHOW_SCHEMA,
    })
    await $.tool.register({
      name: 'mark_results',
      description:
        'Marks report items as applied, failed or skipped in the grooming pane, after the corresponding tracker writes. Read-only: it changes nothing in the tracker.',
      inputSchema: MARK_SCHEMA,
    })
    await $.command.register({
      name: 'groom-report',
      description: 'Reopen the backlog grooming checklist pane',
    })
    return next(e)
  })

  on('command.run', { command: 'groom-report' }, async $ => {
    if ((await read($, report)) === null) {
      return { text: 'No grooming report yet. Run /backlog-groomer:groom first.' }
    }
    await openPane($, true)
    return { text: 'Grooming report pane opened.' }
  })

  on('tool.call', { tool: 'mcp__backlog-groomer__show_report' }, async ($, e) => {
    const items = parseItems(e.items)
    if (items.length === 0) {
      return { deny: 'show_report needs at least one item with a numeric "n".' }
    }
    const next: GroomReport = {
      scope: asText(e.scope, 'backlog'),
      tracker: asText(e.tracker, 'tracker'),
      scanned: typeof e.scanned === 'number' ? e.scanned : items.length,
      staleDays: typeof e.staleDays === 'number' ? e.staleDays : undefined,
      skipped: typeof e.skipped === 'string' && e.skipped !== '' ? e.skipped : undefined,
      items,
    }
    await update($, report, () => next)
    await update($, selected, () => [])
    await update($, results, () => ({}))
    await update($, bucket, () => 'all')
    let where = 'The checklist pane could not be opened on this surface; the markdown report stands.'
    try {
      const opened = await openPane($, true)
      where = opened.isPlaced
        ? 'The checklist pane is open.'
        : 'The pane is waiting for more terminal width; the person can run /groom-report to open it.'
    } catch {
      // Headless runs and surfaces without panes: the markdown report is enough.
    }
    return {
      result: `${where} ${items.length} items shown. Wait for the person: they either type "apply …" or press Apply in the pane, which sends the same message. After applying, call mark_results.`,
    }
  })

  on('tool.call', { tool: 'mcp__backlog-groomer__mark_results' }, async ($, e) => {
    const list = Array.isArray(e.results) ? e.results : []
    let count = 0
    await update($, results, current => {
      const next = { ...current }
      for (const raw of list) {
        if (raw === null || typeof raw !== 'object') continue
        const one = raw as Record<string, unknown>
        const status = one.status as GroomResultStatus
        if (typeof one.n !== 'number' || !STATUSES.includes(status)) continue
        next[String(one.n)] = typeof one.note === 'string' ? { status, note: one.note } : { status }
        count += 1
      }
      return next
    })
    return { result: `Marked ${count} item(s) in the pane.` }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const shown = await read($, report)
    if (shown === null) {
      return <Text dimColor>No grooming report yet. Run /backlog-groomer:groom.</Text>
    }
    const picked = await read($, selected)
    const done = await read($, results)
    const filter = await read($, bucket)
    const visible = filter === 'all' ? shown.items : shown.items.filter(item => item.bucket === filter)
    const open = shown.items.filter(item => done[String(item.n)] === undefined)
    const pickable = picked.filter(n => done[String(n)] === undefined)
    const applied = Object.values(done).filter(result => result.status === 'applied').length

    const toggle = (n: number) =>
      update($, selected, current =>
        current.includes(n) ? current.filter(one => one !== n) : [...current, n],
      )
    const selectVisible = () =>
      update($, selected, current => {
        const ids = visible.filter(item => done[String(item.n)] === undefined).map(item => item.n)
        return [...new Set([...current, ...ids])]
      })

    return (
      <Box flexDirection="column">
        <Text>
          <Text bold>{shown.scope}</Text>
          <Text dimColor>
            {' '}
            · {shown.tracker} · {shown.scanned} scanned
            {shown.staleDays === undefined ? '' : ` · stale ≥ ${shown.staleDays}d`} · {applied}/
            {shown.items.length} applied
          </Text>
        </Text>
        {shown.skipped !== undefined && <Text dimColor>Skipped: {shown.skipped}</Text>}
        <Box flexDirection="row" flexWrap="wrap" columnGap={1} marginTop={1}>
          {['all', ...bucketsOf(shown.items)].map(name => (
            <Button
              key={`bucket:${name}`}
              plain
              dimColor={filter !== name}
              label={`${name === 'all' ? 'All' : name} (${
                name === 'all' ? shown.items.length : shown.items.filter(item => item.bucket === name).length
              })`}
              onPress={() => update($, bucket, () => name)}
            />
          ))}
        </Box>
        <Box flexDirection="column" marginTop={1}>
          {visible.map(item => {
            const result = done[String(item.n)]
            const isPicked = picked.includes(item.n)
            return (
              <Box key={`row:${item.n}`} flexDirection="column">
                <Box flexDirection="row" columnGap={1}>
                  <Button
                    key={`toggle:${item.n}`}
                    plain
                    label={mark(result, isPicked)}
                    onPress={() => (result === undefined ? toggle(item.n) : undefined)}
                  />
                  <Text dimColor>{String(item.n).padStart(2)}</Text>
                  <Text color="cyan">{item.issue}</Text>
                  <Text dimColor>{item.bucket}</Text>
                  <Text wrap="truncate-end">{item.title}</Text>
                </Box>
                <Box paddingLeft={8}>
                  <Text dimColor wrap="truncate-end">
                    → {item.action}
                    {item.reason === '' ? '' : ` — ${item.reason}`}
                    {result?.note === undefined ? '' : ` (${result.note})`}
                  </Text>
                </Box>
              </Box>
            )
          })}
        </Box>
        <Box flexDirection="row" columnGap={2} marginTop={1}>
          <Button
            key="apply"
            hotkey="y"
            variant="primary"
            label={`Apply ${pickable.length} selected`}
            onPress={() => apply($)}
          />
          <Button key="select-all" hotkey="a" label="Select shown" onPress={selectVisible} />
          <Button key="clear" hotkey="c" label="Clear" onPress={() => update($, selected, () => [])} />
          <Button key="close" hotkey="q" role="dismiss" label="Close" onPress={() => $.ui.close({ id: PANE })} />
        </Box>
        <Text dimColor>
          {open.length} open · ctrl+x tab to focus · Tab/arrows move · Enter toggles · nothing changes until Apply
        </Text>
      </Box>
    )
  })
}
