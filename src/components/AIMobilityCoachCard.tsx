import { Card } from './Card'
import { useAIMobilityCoach } from '../hooks/useAIMobilityCoach'
import { useAuth } from '../hooks/useAuth'
import type { MobilityPlanItem } from '../db/db'
import { MOBILITY_EXERCISES } from '../data/mobilityExercises'

function parseSimpleMarkdown(text: string): JSX.Element[] {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <br key={i} />

    const headerMatch = line.match(/^\*\*(.+?)\*\*\s*(.*)$/)
    if (headerMatch) {
      return (
        <div key={i} className="mt-2 first:mt-0">
          <span className="text-sm font-bold text-ink">{headerMatch[1]}</span>
          {headerMatch[2] && <span className="text-sm text-ink/80"> {headerMatch[2]}</span>}
        </div>
      )
    }

    if (line.startsWith('- ') || line.startsWith('• ')) {
      return (
        <div key={i} className="flex gap-2 pl-1">
          <span className="text-muted">•</span>
          <span className="text-sm text-ink/80">{renderInline(line.slice(2))}</span>
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

const CATEGORY_COLORS: Record<string, string> = {
  hip: '#2ec4b6',
  spine: '#7c3aed',
  shoulder: '#f59e0b',
  full_body: '#6366f1',
}

interface Props {
  onStartSession?: (plan: MobilityPlanItem[]) => void
}

export default function AIMobilityCoachCard({ onStartSession }: Props) {
  const { user } = useAuth()
  const { coaching, sessionPlan, loading, error, generatedAt, limitReached, refresh } = useAIMobilityCoach()

  if (!user) {
    return (
      <Card className="border-teal/20">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧘</span>
          <div>
            <p className="text-sm font-semibold text-ink">AI Mobility Coach</p>
            <p className="text-xs text-muted">Sign in to enable daily mobility coaching</p>
          </div>
        </div>
      </Card>
    )
  }

  if (loading && !coaching) {
    return (
      <Card className="border-teal/20">
        <div className="flex items-center gap-3">
          <span className="text-lg">🧘</span>
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
            <span className="text-lg">🧘</span>
            <div>
              <p className="text-sm font-semibold text-ink">AI Mobility Coach</p>
              <p className="text-xs text-red-400">{error}</p>
            </div>
          </div>
          <button
            onClick={refresh}
            className="rounded-full bg-teal/10 px-3 py-1.5 text-xs font-semibold text-teal"
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

  const hasSessionPlan = sessionPlan && sessionPlan.length > 0

  return (
    <Card className="border-teal/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧘</span>
          <span className="text-sm font-bold text-ink">AI Mobility Coach</span>
        </div>
        {!limitReached && (
          <button
            onClick={refresh}
            disabled={loading}
            className="text-xs text-muted hover:text-teal transition-colors disabled:opacity-50"
            title="Refresh mobility coaching"
          >
            {loading ? '...' : '↻'}
          </button>
        )}
      </div>

      <div className="space-y-1 mb-3">{parseSimpleMarkdown(coaching)}</div>

      {hasSessionPlan && (
        <div className="space-y-1.5 border-t border-border pt-3">
          {sessionPlan!.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-lg bg-card2 px-3 py-2"
            >
              <div
                className="w-1.5 h-8 rounded-full flex-shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[item.category] ?? '#6b7280' }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-ink truncate">{item.name}</div>
                {(() => {
                  const ex = MOBILITY_EXERCISES.find((e) => e.id === item.exerciseId)
                  return ex?.description ? (
                    <div className="text-[10px] text-muted/70 truncate">{ex.description}</div>
                  ) : null
                })()}
                {item.notes && (
                  <div className="text-[10px] text-muted truncate">{item.notes}</div>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="text-xs font-bold text-teal">
                  {item.sets > 1 ? `${item.sets}×` : ''}{item.holdSec}s
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasSessionPlan && onStartSession && (
        <button
          onClick={() => onStartSession(sessionPlan!)}
          className="mt-3 w-full rounded-xl bg-teal/15 border border-teal/30 py-2.5 text-xs font-bold text-teal"
        >
          Start session
        </button>
      )}

      {timeStr && (
        <p className="mt-2 text-[10px] text-muted">
          Generated today at {timeStr}
        </p>
      )}
    </Card>
  )
}
