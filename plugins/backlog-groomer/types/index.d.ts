export type GroomItem = {
  n: number
  issue: string
  url?: string
  title: string
  bucket: string
  action: string
  reason: string
  /** Exact text the apply step will post: the comment, or the new description. */
  draft?: string
  /** What `draft` is: "Comment", "New description", ... */
  draftKind?: string
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
      preview: number | null
    }
  }
}
