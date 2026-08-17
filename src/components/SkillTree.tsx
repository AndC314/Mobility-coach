import { useState } from 'react'
import { Card, Tag } from './Card'
import { useSkillTree } from '../hooks/useSkillTree'
import { useProgressionState, useCurrentLevel, type ResolvedChain, type ResolvedNode, type NodeUnlockStatus } from '../hooks/useProgressionState'
import { LEVEL_COLORS, LEVEL_LABELS } from '../data/progressionChains'
import LevelAssessment from './LevelAssessment'
import type { SkillBranch, SkillNode, NodeStatus } from '../lib/skillTree'

type BranchId = 'push' | 'pull' | 'legs' | 'core' | 'mobility' | 'bjj'

const BRANCH_TABS: { id: BranchId; label: string; icon: string }[] = [
  { id: 'push', label: 'Push', icon: '💪' },
  { id: 'pull', label: 'Pull', icon: '🧗' },
  { id: 'legs', label: 'Legs', icon: '🦵' },
  { id: 'core', label: 'Core', icon: '🛡️' },
  { id: 'mobility', label: 'Mobility', icon: '🧘' },
  { id: 'bjj', label: 'BJJ', icon: '🥋' },
]

const STATUS_STYLE: Record<NodeUnlockStatus, { ring: string; fill: string; label: string }> = {
  locked: { ring: '#2e3248', fill: 'transparent', label: 'Locked' },
  unlocked: { ring: '#7a7d96', fill: 'transparent', label: 'Available' },
  in_progress: { ring: '#f5c842', fill: '#f5c84222', label: 'In progress' },
  mastered: { ring: '#2ec4b6', fill: '#2ec4b622', label: 'Mastered' },
}

const LEGACY_STATUS_STYLE: Record<NodeStatus, { ring: string; fill: string; label: string }> = {
  locked: { ring: '#2e3248', fill: 'transparent', label: 'Not started' },
  available: { ring: '#7a7d96', fill: 'transparent', label: 'Available' },
  in_progress: { ring: '#f5c842', fill: '#f5c84222', label: 'In progress' },
  mastered: { ring: '#2ec4b6', fill: '#2ec4b622', label: 'Mastered' },
}

export default function SkillTree() {
  const legacyBranches = useSkillTree()
  const progressionChains = useProgressionState()
  const currentLevel = useCurrentLevel()
  const [activeBranch, setActiveBranch] = useState<BranchId>('push')
  const [showAssessment, setShowAssessment] = useState(false)

  if (!legacyBranches || !progressionChains) {
    return <p className="py-8 text-center text-sm text-muted">Loading your skill tree...</p>
  }

  if (showAssessment) {
    return <LevelAssessment onClose={() => setShowAssessment(false)} />
  }

  const chainsForCategory = progressionChains.filter((c) => c.category === activeBranch)
  const mobilityBranch = legacyBranches.find((b) => b.id === 'mobility')
  const bjjBranch = legacyBranches.find((b) => b.id === 'bjj')

  return (
    <div className="space-y-4">
      {currentLevel && (
        <button
          onClick={() => setShowAssessment(true)}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3"
        >
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-black"
              style={{ background: currentLevel.color + '22', color: currentLevel.color }}
            >
              {currentLevel.level}
            </span>
            <div className="text-left">
              <div className="text-sm font-bold text-ink">{currentLevel.label}</div>
              <div className="text-[11px] text-muted">Overall level</div>
            </div>
          </div>
          <span className="text-xs font-semibold text-teal">Test level &rarr;</span>
        </button>
      )}

      <div className="flex gap-1 overflow-x-auto pb-1">
        {BRANCH_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveBranch(t.id)}
            className={`flex-shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
              activeBranch === t.id
                ? 'bg-teal/20 text-teal border border-teal/40'
                : 'bg-card text-muted border border-border'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {(activeBranch === 'push' || activeBranch === 'pull' || activeBranch === 'legs' || activeBranch === 'core') && (
        <ProgressionView chains={chainsForCategory} />
      )}

      {activeBranch === 'mobility' && mobilityBranch && <LegacyBranchView branch={mobilityBranch} />}
      {activeBranch === 'bjj' && bjjBranch && <LegacyBranchView branch={bjjBranch} />}
    </div>
  )
}

function ProgressionView({ chains }: { chains: ResolvedChain[] }) {
  if (chains.length === 0) {
    return (
      <Card>
        <p className="py-4 text-center text-sm text-muted">No progression chains for this category</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {chains.map((chain) => (
        <Card key={chain.id}>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink">{chain.label}</h3>
              <p className="text-[11px] text-muted">{chain.description}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{
                  background: LEVEL_COLORS[chain.overallLevel] + '22',
                  color: LEVEL_COLORS[chain.overallLevel],
                }}
              >
                Lv.{chain.overallLevel}
              </span>
            </div>
          </div>

          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-teal transition-all"
              style={{ width: `${chain.overallProgress}%` }}
            />
          </div>

          <div className="relative">
            {chain.nodes.map((node, i) => (
              <ProgressionNodeRow
                key={node.exerciseId}
                node={node}
                isLast={i === chain.nodes.length - 1}
              />
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

function ProgressionNodeRow({ node, isLast }: { node: ResolvedNode; isLast: boolean }) {
  const [open, setOpen] = useState(false)
  const style = STATUS_STYLE[node.status]
  const levelColor = LEVEL_COLORS[node.level] ?? '#7a7d96'
  const size = 40

  const progressPercent = node.status === 'mastered' ? 100
    : node.status === 'in_progress' ? node.progressTowardNext
    : 0

  return (
    <div className="relative flex gap-3 pb-1">
      {!isLast && (
        <div
          className="absolute left-[19px] top-10 w-0.5"
          style={{
            height: 'calc(100% - 0px)',
            background: node.status === 'locked' ? '#2e324844' : '#2e3248',
          }}
        />
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="relative z-10 flex-shrink-0"
        style={{ width: size, height: size, opacity: node.status === 'locked' ? 0.4 : 1 }}
      >
        <svg width={size} height={size} className="-rotate-90 absolute inset-0">
          <circle cx={size / 2} cy={size / 2} r={(size - 5) / 2} fill={style.fill} stroke="#2e3248" strokeWidth="2.5" />
          {progressPercent > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={(size - 5) / 2}
              fill="none"
              stroke={style.ring}
              strokeWidth="2.5"
              strokeDasharray={2 * Math.PI * ((size - 5) / 2)}
              strokeDashoffset={2 * Math.PI * ((size - 5) / 2) * (1 - progressPercent / 100)}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-extrabold" style={{ color: style.ring }}>
          {node.status === 'mastered' ? '✓' : node.status === 'locked' ? '🔒' : node.level}
        </div>
      </button>

      <div className="flex-1 pb-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between text-left"
          style={{ opacity: node.status === 'locked' ? 0.5 : 1 }}
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-ink truncate">{node.exerciseName}</div>
            <div className="text-[11px] text-muted">
              {node.best != null
                ? `Best: ${node.best}${node.unit === 's' ? 's' : ' reps'}`
                : node.status === 'locked'
                  ? 'Locked'
                  : 'No data yet'}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: levelColor }}
            />
            <Tag color={style.ring}>{style.label}</Tag>
          </div>
        </button>

        {open && node.status !== 'locked' && (
          <div className="mt-2 rounded-lg bg-card2 p-3 space-y-2">
            {node.nextUnlockThreshold != null && node.unlocksExercise && (
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="text-muted">
                    Unlocks <span className="font-semibold text-ink">{node.unlocksExercise}</span>
                  </span>
                  <span className="font-bold" style={{ color: style.ring }}>
                    {node.best ?? 0}/{node.nextUnlockThreshold}{node.nextUnlockUnit === 's' ? 's' : ''}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${node.progressTowardNext}%`,
                      background: node.progressTowardNext >= 100 ? '#2ec4b6' : '#f5c842',
                    }}
                  />
                </div>
              </div>
            )}
            {node.status === 'mastered' && !node.unlocksExercise && (
              <p className="text-[11px] text-teal font-semibold">Chain complete — mastered!</p>
            )}
          </div>
        )}

        {open && node.status === 'locked' && (
          <div className="mt-2 rounded-lg bg-card2 p-3">
            <p className="text-[11px] text-muted">
              Requirements not met yet. Keep training the previous exercises to unlock.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function LegacyBranchView({ branch }: { branch: SkillBranch }) {
  return (
    <div className="space-y-4">
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
          {branch.id === 'bjj' && 'Tiers grow as you log more classes tagged with each skill.'}
        </p>
      </Card>

      {branch.nodes.length === 0 ? (
        <Card>
          <p className="py-4 text-center text-sm text-muted">
            {branch.id === 'bjj' ? 'No skills yet — add some in Settings' : 'No data yet'}
          </p>
        </Card>
      ) : (
        <Card>
          <div className="relative">
            {branch.nodes.map((node, i) => (
              <LegacyNodeRow key={node.id} node={node} isLast={i === branch.nodes.length - 1} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function LegacyNodeRow({ node, isLast }: { node: SkillNode; isLast: boolean }) {
  const [open, setOpen] = useState(false)
  const style = LEGACY_STATUS_STYLE[node.status]
  const size = 40

  return (
    <div className="relative flex gap-3 pb-1">
      {!isLast && (
        <div
          className="absolute left-[19px] top-10 w-0.5"
          style={{ height: 'calc(100% - 0px)', background: '#2e3248' }}
        />
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="relative z-10 flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90 absolute inset-0">
          <circle cx={size / 2} cy={size / 2} r={(size - 5) / 2} fill={style.fill} stroke="#2e3248" strokeWidth="2.5" />
          {node.progressPercent > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={(size - 5) / 2}
              fill="none"
              stroke={style.ring}
              strokeWidth="2.5"
              strokeDasharray={2 * Math.PI * ((size - 5) / 2)}
              strokeDashoffset={2 * Math.PI * ((size - 5) / 2) * (1 - node.progressPercent / 100)}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-extrabold" style={{ color: style.ring }}>
          {node.status === 'mastered' ? '✓' : node.tier}
        </div>
      </button>

      <div className="flex-1 pb-3">
        <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
          <div>
            <div className="text-sm font-bold text-ink">{node.label}</div>
            <div className="text-[11px] text-muted">{node.detail}</div>
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
