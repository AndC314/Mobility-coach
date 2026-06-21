import { useState } from 'react'
import { Card, Tag } from './Card'
import { useSkillTree } from '../hooks/useSkillTree'
import type { SkillBranch, SkillNode, NodeStatus } from '../lib/skillTree'

const STATUS_STYLE: Record<NodeStatus, { ring: string; fill: string; label: string }> = {
  locked: { ring: '#2e3248', fill: 'transparent', label: 'Not started' },
  available: { ring: '#7a7d96', fill: 'transparent', label: 'Available' },
  in_progress: { ring: '#f5c842', fill: '#f5c84222', label: 'In progress' },
  mastered: { ring: '#2ec4b6', fill: '#2ec4b622', label: 'Mastered' }
}

export default function SkillTree() {
  const branches = useSkillTree()
  const [activeBranch, setActiveBranch] = useState<'mobility' | 'calisthenics' | 'bjj'>('mobility')

  if (!branches || branches.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">Loading your skill tree…</p>
  }

  const branch = branches.find((b) => b.id === activeBranch) ?? branches[0]

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {branches.map((b) => (
          <button
            key={b.id}
            onClick={() => setActiveBranch(b.id)}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors ${
              activeBranch === b.id
                ? 'bg-teal/20 text-teal border border-teal/40'
                : 'bg-card text-muted border border-border'
            }`}
          >
            {b.icon} {b.label}
          </button>
        ))}
      </div>

      <Card>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-bold">
            {branch.icon} {branch.label}
          </h2>
          <span className="text-sm font-bold" style={{ color: '#2ec4b6' }}>
            {branch.overallPercent}%
          </span>
        </div>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-teal transition-all"
            style={{ width: `${branch.overallPercent}%` }}
          />
        </div>
        <p className="text-xs text-muted">
          {branch.id === 'mobility' && 'Each path runs through 4 phases — Awareness, Release, Integration, Strength.'}
          {branch.id === 'calisthenics' && 'Tiers are based on your best logged measurement for each skill.'}
          {branch.id === 'bjj' && 'Tiers grow as you log more classes tagged with each skill — exposure, not a judgment of competency.'}
        </p>
      </Card>

      {branch.nodes.length === 0 ? (
        <Card>
          <p className="py-4 text-center text-sm text-muted">No skills yet — add some in the Skill Map tab</p>
        </Card>
      ) : (
        <Card>
          <div className="relative">
            {branch.nodes.map((node, i) => (
              <NodeRow key={node.id} node={node} isLast={i === branch.nodes.length - 1} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function NodeRow({ node, isLast }: { node: SkillNode; isLast: boolean }) {
  const [open, setOpen] = useState(false)
  const style = STATUS_STYLE[node.status]
  const size = 44

  return (
    <div className="relative flex gap-3 pb-1">
      {/* connecting line */}
      {!isLast && (
        <div
          className="absolute left-[21px] top-11 w-0.5"
          style={{ height: 'calc(100% - 0px)', background: '#2e3248' }}
        />
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="relative z-10 flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90 absolute inset-0">
          <circle cx={size / 2} cy={size / 2} r={(size - 6) / 2} fill={style.fill} stroke="#2e3248" strokeWidth="3" />
          {node.progressPercent > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={(size - 6) / 2}
              fill="none"
              stroke={style.ring}
              strokeWidth="3"
              strokeDasharray={2 * Math.PI * ((size - 6) / 2)}
              strokeDashoffset={2 * Math.PI * ((size - 6) / 2) * (1 - node.progressPercent / 100)}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-extrabold" style={{ color: style.ring }}>
          {node.status === 'mastered' ? '✓' : node.tier}
        </div>
      </button>

      <div className="flex-1 pb-4">
        <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
          <div>
            <div className="text-sm font-bold text-ink">{node.label}</div>
            <div className="text-xs text-muted">{node.detail}</div>
          </div>
          <Tag color={style.ring}>{style.label}</Tag>
        </button>

        {open && (
          <div className="mt-2 rounded-lg bg-card2 p-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted">
                Tier {node.tier} of {node.maxTier}
              </span>
              <span style={{ color: style.ring }}>{node.progressPercent}% to next tier</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${node.progressPercent}%`, background: style.ring }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
