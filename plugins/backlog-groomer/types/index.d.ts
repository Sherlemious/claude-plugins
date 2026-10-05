export type GroomItem = {
  n: number
  issue: string
  url?: string
  title: string
  bucket: string
  action: string
  reason: string
}

export type GroomReport = {
  scope: string
  tracker: string
  scanned: number
  staleDays?: number
  skipped?: string
  items: GroomItem[]
}

export type GroomResultStatus = 'pending' | 'applied' | 'failed' | 'skipped'

export type GroomResult = { status: GroomResultStatus; note?: string }

declare module 'claude-code' {
  interface PluginState {
    'backlog-groomer': {
      report: GroomReport | null
      selected: number[]
      results: Record<string, GroomResult>
      bucket: string
    }
  }
}
