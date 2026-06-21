import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { Card, Tag } from './Card'
import { useBjjSkillTags, useBjjClassLogs, useTagFrequency } from '../hooks/useBjjSkills'
import { todayIso } from '../lib/date'

const PALETTE = ['#2ec4b6', '#f5c842', '#e8622a', '#a78bfa', '#7a7d96']

export default function BjjSkillsSection() {
  const [view, setView] = useState<'log' | 'patterns' | 'tags'>('log')

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {(
          [
            { id: 'log', label: 'Log Class' },
            { id: 'patterns', label: 'Patterns' },
            { id: 'tags', label: 'Skill Map' }
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors ${
              view === t.id ? 'bg-accent/20 text-accent border border-accent/40' : 'bg-card text-muted border border-border'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'log' && <LogClassView />}
      {view === 'patterns' && <PatternsView />}
      {view === 'tags' && <SkillMapView />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// LOG CLASS
// ─────────────────────────────────────────────────────────────────────────

function LogClassView() {
  const { tags, addTag } = useBjjSkillTags()
  const { logs, addClassLog, deleteClassLog } = useBjjClassLogs()

  const [date, setDate] = useState(todayIso())
  const [className, setClassName] = useState('')
  const [theme, setTheme] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [notes, setNotes] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [saved, setSaved] = useState(false)

  function toggleTag(id: number) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  async function handleAddNewTag() {
    if (!newTagName.trim()) return
    const id = await addTag(newTagName.trim())
    if (id) setSelectedTagIds((prev) => [...prev, id as number])
    setNewTagName('')
  }

  async function handleSave() {
    await addClassLog({
      date,
      className: className.trim() || undefined,
      theme: theme.trim() || undefined,
      tagIds: selectedTagIds,
      notes: notes.trim() || undefined
    })
    setClassName('')
    setTheme('')
    setSelectedTagIds([])
    setNotes('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 text-base font-bold">Log a class</h2>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Class</label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. Beginners & Intermediates"
              className="w-full rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink placeholder:text-muted"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Lesson theme (from the gym)</label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g. Armlock Variations"
              className="w-full rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink placeholder:text-muted"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Your skill tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => {
                const active = selectedTagIds.includes(t.id!)
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTag(t.id!)}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={
                      active
                        ? { background: (t.color ?? '#2ec4b6') + '22', color: t.color ?? '#2ec4b6', border: `1px solid ${(t.color ?? '#2ec4b6')}55` }
                        : { background: '#262b40', color: '#7a7d96', border: '1px solid #2e3248' }
                    }
                  >
                    {t.name}
                  </button>
                )
              })}
            </div>

            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNewTag()}
                placeholder="Add a new skill tag…"
                className="flex-1 rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink placeholder:text-muted"
              />
              <button
                onClick={handleAddNewTag}
                className="rounded-lg bg-teal/20 px-3 py-2 text-sm font-bold text-teal border border-teal/40"
              >
                +
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted">
              Tag with whatever YOU recognize — e.g. a class on "Armlock Variations" might also be
              "Closed Guard" + "Side Attack" for you. Refine and add tags any time in Skill Map.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What clicked, what felt rough, key details to remember…"
              rows={2}
              className="w-full rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink placeholder:text-muted"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full rounded-full bg-accent/20 py-3 text-sm font-bold text-accent border border-accent/40"
          >
            {saved ? '✓ Saved' : 'Save class log'}
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-bold">Recent classes</h2>
        {logs.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted">No classes logged yet</p>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 10).map((log) => (
              <div key={log.id} className="rounded-xl bg-card2 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">{log.theme || log.className || 'Class'}</span>
                  <button onClick={() => deleteClassLog(log.id!)} className="text-xs text-muted">
                    ✕
                  </button>
                </div>
                <div className="mb-1.5 text-xs text-muted">
                  {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  {log.className && log.theme ? ` · ${log.className}` : ''}
                </div>
                {log.tagIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {log.tagIds.map((tagId) => {
                      const t = tags.find((x) => x.id === tagId)
                      if (!t) return null
                      return (
                        <Tag key={tagId} color={t.color ?? '#2ec4b6'}>
                          {t.name}
                        </Tag>
                      )
                    })}
                  </div>
                )}
                {log.notes && <p className="mt-1.5 text-xs leading-relaxed text-ink/70">{log.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// PATTERNS (buildup of tag frequency)
// ─────────────────────────────────────────────────────────────────────────

function PatternsView() {
  const frequency = useTagFrequency()
  const totalLogs = frequency.reduce((s, f) => s + f.count, 0) > 0

  const chartData = frequency
    .filter((f) => f.count > 0)
    .map((f) => ({ name: f.tag.name, count: f.count, color: f.tag.color ?? '#2ec4b6' }))

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-1 text-base font-bold">Skill buildup</h2>
        <p className="mb-3 text-xs text-muted">How often each of your tags shows up across logged classes.</p>

        {!totalLogs ? (
          <p className="py-6 text-center text-sm text-muted">Log a few classes to see patterns emerge</p>
        ) : (
          <div style={{ height: Math.max(160, chartData.length * 36) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fill: '#e8e8f0', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ background: '#22263a', border: '1px solid #2e3248', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#e8e8f0' }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {totalLogs && (
        <Card>
          <h2 className="mb-2 text-base font-bold">Reading this</h2>
          <p className="text-xs leading-relaxed text-ink/70">
            Tags with high counts are areas you’ve seen repeatedly — good candidates for drilling
            outside class. Tags with zero or low counts might be gaps in what your gym has covered
            recently, or areas you haven’t learned to recognize/tag yet.
          </p>
        </Card>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// SKILL MAP (taxonomy manager)
// ─────────────────────────────────────────────────────────────────────────

function SkillMapView() {
  const { tags, addTag, updateTag, deleteTag } = useBjjSkillTags()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draftDescription, setDraftDescription] = useState('')
  const [newTagName, setNewTagName] = useState('')

  function startEdit(id: number, description: string) {
    setEditingId(id)
    setDraftDescription(description)
  }

  async function saveEdit() {
    if (editingId == null) return
    await updateTag(editingId, { description: draftDescription })
    setEditingId(null)
  }

  async function handleAddNewTag() {
    if (!newTagName.trim()) return
    await addTag(newTagName.trim())
    setNewTagName('')
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-1 text-base font-bold">Your skill map</h2>
        <p className="mb-3 text-xs text-muted">
          Edit descriptions as your understanding grows, or add new categories. These are personal —
          there’s no wrong taxonomy.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddNewTag()}
            placeholder="Add a new skill…"
            className="flex-1 rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink placeholder:text-muted"
          />
          <button
            onClick={handleAddNewTag}
            className="rounded-lg bg-teal/20 px-4 py-2 text-sm font-bold text-teal border border-teal/40"
          >
            Add
          </button>
        </div>
      </Card>

      <div className="space-y-2">
        {tags.map((t) => (
          <Card key={t.id} className="p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: t.color ?? '#2ec4b6' }}>
                {t.name}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(t.id!, t.description)}
                  className="text-xs font-semibold text-muted"
                >
                  Edit
                </button>
                <button onClick={() => deleteTag(t.id!)} className="text-xs font-semibold text-muted">
                  Delete
                </button>
              </div>
            </div>

            {editingId === t.id ? (
              <div className="space-y-2">
                <textarea
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-card2 px-3 py-2 text-sm text-ink"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    className="rounded-lg bg-teal/20 px-3 py-1.5 text-xs font-bold text-teal border border-teal/40"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-lg bg-card2 px-3 py-1.5 text-xs font-bold text-muted border border-border"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-ink/70">{t.description || 'No description yet.'}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
