import { Card } from './Card'
import { useAICoach } from '../hooks/useAICoach'
import { useAuth } from '../hooks/useAuth'

function cleanCoaching(text: string): string {
  return text
    .replace(/^\s*\)\s*/gm, '')
    .replace(/^\s*\*\s+(?!\*)/gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function parseSimpleMarkdown(text: string): JSX.Element[] {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <br key={i} />

    // Bold headers like **📊 Current State**
    const headerMatch = line.match(/^\*\*(.+?)\*\*\s*(.*)$/)
    if (headerMatch) {
      return (
        <div key={i} className="mt-3 first:mt-0">
          <span className="text-sm font-bold text-ink">{headerMatch[1]}</span>
          {headerMatch[2] && <span className="text-sm text-ink/80"> {headerMatch[2]}</span>}
        </div>
      )
    }

    // Bullet points
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const content = line.slice(2)
      return (
        <div key={i} className="flex gap-2 pl-1">
          <span className="text-muted">•</span>
          <span className="text-sm text-ink/80">{renderInline(content)}</span>
        </div>
      )
    }

    return <p key={i} className="text-sm text-ink/80">{renderInline(line)}</p>
  })
}

function renderInline(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = []
  const regex = /\*\*(.+?)\*\*/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push(<strong key={match.index} className="font-semibold text-ink">{match[1]}</strong>)
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export default function AICoachCard() {
  const { user } = useAuth()
  const { coaching, loading, error, generatedAt, limitReached, refresh } = useAICoach()

  if (!user) {
    return (
      <Card className="border-accent/20">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <p className="text-sm font-semibold text-ink">AI Coach</p>
            <p className="text-xs text-muted">Sign in to enable daily coaching</p>
          </div>
        </div>
      </Card>
    )
  }

  if (loading && !coaching) {
    return (
      <Card className="border-accent/20">
        <div className="flex items-center gap-3">
          <span className="text-lg">🤖</span>
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 animate-pulse rounded bg-border" />
            <div className="h-3 w-full animate-pulse rounded bg-border" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-border" />
          </div>
        </div>
      </Card>
    )
  }

  if (error && !coaching) {
    return (
      <Card className="border-red-400/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <div>
              <p className="text-sm font-semibold text-ink">AI Coach</p>
              <p className="text-xs text-red-400">{error}</p>
            </div>
          </div>
          <button
            onClick={refresh}
            className="rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent"
          >
            Retry
          </button>
        </div>
      </Card>
    )
  }

  if (!coaching) return null

  const timeStr = generatedAt
    ? new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <Card className="border-accent/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="text-sm font-bold text-ink">AI Coach</span>
        </div>
        {!limitReached && (
          <button
            onClick={refresh}
            disabled={loading}
            className="text-xs text-muted hover:text-accent transition-colors disabled:opacity-50"
            title="Refresh coaching"
          >
            {loading ? '...' : '↻'}
          </button>
        )}
      </div>

      <div className="space-y-1">{parseSimpleMarkdown(cleanCoaching(coaching))}</div>

      {timeStr && (
        <p className="mt-3 text-[10px] text-muted">
          Generated today at {timeStr}
        </p>
      )}
    </Card>
  )
}
