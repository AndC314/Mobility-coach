# Avatar Training Bars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two vertical Diablo-style progress bars flanking the avatar sprite — green (Mobility) on the left, blue (Calisthenics) on the right — driven by decay-adjusted training hours.

**Architecture:** A new `useTrainingBars` hook reads effective hours from the existing `computeTrainingHours` utility and normalizes them to 0–100. A `VerticalBar` component renders the bar UI. `SpriteAvatarDisplay` is restructured from a vertical stack into a flex row that places bars on either side of the sprite.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Dexie (`useLiveQuery`), existing `trainingHourCalculator.ts`.

## Global Constraints

- No test framework installed — verification is `tsc -b && vite build` (must pass) + visual check via `npm run dev`.
- TypeScript strict mode — no `any`, no `ts-ignore`.
- Tailwind only — no inline style objects except where Tailwind cannot express dynamic values (e.g. `height: ${value}%`).
- Do not modify `trainingHourCalculator.ts`, `useAvatarProgression.ts`, or any page files.
- `VerticalBar` lives inline in `AvatarDisplay.tsx` — no new file for the component.
- Only `SpriteAvatarDisplay` is updated inside `AvatarDisplay.tsx`. `ProceduralAvatarDisplay` is untouched.

---

### Task 1: `useTrainingBars` hook

**Files:**
- Create: `src/hooks/useTrainingBars.ts`

**Interfaces:**
- Consumes: `computeTrainingHours(category)` from `../lib/trainingHourCalculator` — returns `Promise<TrainingHours>` where `TrainingHours.totalHours: number` is the decay-adjusted effective hours.
- Produces:
  ```ts
  export interface TrainingBars {
    mobilityPct: number      // 0–100
    calisthenicsPct: number  // 0–100
  }
  export function useTrainingBars(): TrainingBars
  ```

- [ ] **Step 1: Create the hook file**

```ts
// src/hooks/useTrainingBars.ts
import { useLiveQuery } from 'dexie-react-hooks'
import { computeTrainingHours } from '../lib/trainingHourCalculator'

export interface TrainingBars {
  mobilityPct: number
  calisthenicsPct: number
}

const HOURS_CAP = 30

function toPct(activeHours: number): number {
  return Math.min(100, Math.round((activeHours / HOURS_CAP) * 100))
}

const LOADING_DEFAULT: TrainingBars = { mobilityPct: 0, calisthenicsPct: 0 }

export function useTrainingBars(): TrainingBars {
  return useLiveQuery(async () => {
    const [mobility, calisthenics] = await Promise.all([
      computeTrainingHours('mobility'),
      computeTrainingHours('calisthenics'),
    ])
    return {
      mobilityPct: toPct(mobility.totalHours),
      calisthenicsPct: toPct(calisthenics.totalHours),
    }
  }, [], LOADING_DEFAULT) ?? LOADING_DEFAULT
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/acastiglioni/Desktop/Repos/Mobility-coach
node_modules/.bin/tsc --noEmit 2>&1 || npx tsc --noEmit 2>&1
```

Expected: no errors in `src/hooks/useTrainingBars.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTrainingBars.ts
git commit -m "feat: add useTrainingBars hook (decay-adjusted mobility + calisthenics pct)"
```

---

### Task 2: `VerticalBar` component + `SpriteAvatarDisplay` layout

**Files:**
- Modify: `src/components/AvatarDisplay.tsx`

**Interfaces:**
- Consumes: `useTrainingBars(): TrainingBars` from `../hooks/useTrainingBars`
- Consumes (already present): `useAvatarProgression()`, `SpriteAnimator`, `Card`

- [ ] **Step 1: Add the import for `useTrainingBars` at the top of `AvatarDisplay.tsx`**

Find the existing imports block (around line 1–6) and add:

```ts
import { useTrainingBars } from '../hooks/useTrainingBars'
```

- [ ] **Step 2: Add `VerticalBar` component**

Insert this component just above the `SpriteAvatarDisplay` function definition (around line 60):

```tsx
interface VerticalBarProps {
  value: number   // 0–100
  color: string
  label: string
  height: number  // px
}

function VerticalBar({ value, color, label, height }: VerticalBarProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative w-2.5 rounded-full overflow-hidden bg-border"
        style={{ height }}
      >
        <div
          className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-700 ease-out"
          style={{
            height: `${value}%`,
            backgroundColor: color,
            boxShadow: `inset 0 2px 4px rgba(255,255,255,0.15)`,
          }}
        />
      </div>
      <span className="text-[9px] font-bold uppercase text-muted">{label}</span>
    </div>
  )
}
```

- [ ] **Step 3: Update `SpriteAvatarDisplay` to use the bars**

Replace the current `SpriteAvatarDisplay` function body. The existing function starts at around line 60 and looks like:

```tsx
function SpriteAvatarDisplay({ compact = false }: { compact?: boolean }) {
  const { state, spriteUrl, hoursUntilNext, isLoading, spriteConfig } = useAvatarProgression()
  ...
  const scale = compact ? 2.5 : 3
  ...
  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex flex-col items-center gap-3">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'center', lineHeight: 0 }}>
          <SpriteAnimator src={spriteUrl} config={spriteConfig} />
        </div>
        <div className="text-center">
          <div ...>{description}</div>
          <div className="text-xs text-muted">{state.totalHours}h trained</div>
        </div>
      </div>

      {hoursUntilNext !== Infinity && (
        <Card ...>...</Card>
      )}
    </div>
  )
}
```

Replace it with:

```tsx
function SpriteAvatarDisplay({ compact = false }: { compact?: boolean }) {
  const { state, spriteUrl, hoursUntilNext, isLoading, spriteConfig } = useAvatarProgression()
  const { mobilityPct, calisthenicsPct } = useTrainingBars()

  if (isLoading || !state || !spriteUrl || !spriteConfig) {
    return (
      <div className="flex items-center justify-center h-32 text-muted">
        Loading avatar...
      </div>
    )
  }

  const scale = compact ? 2.5 : 3
  const spriteRenderedHeight = spriteConfig.frameHeight * scale  // 64 * 2.5 = 160px compact
  const description = getAvatarDescription(state)
  const progressPercent = !hoursUntilNext || hoursUntilNext === Infinity
    ? 100
    : Math.max(0, 100 - (hoursUntilNext / 40) * 100)

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {/* Sprite row with flanking bars */}
      <div className="flex items-center justify-center gap-2">
        <VerticalBar
          value={mobilityPct}
          color="#22c55e"
          label="MOB"
          height={spriteRenderedHeight}
        />

        <div className="flex flex-col items-center gap-3">
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'center', lineHeight: 0 }}>
            <SpriteAnimator src={spriteUrl} config={spriteConfig} />
          </div>
          <div className="text-center">
            <div className={compact ? 'text-sm font-semibold text-ink' : 'text-sm font-semibold text-ink'}>
              {description}
            </div>
            <div className="text-xs text-muted">{state.totalHours}h trained</div>
          </div>
        </div>

        <VerticalBar
          value={calisthenicsPct}
          color="#3b82f6"
          label="CAL"
          height={spriteRenderedHeight}
        />
      </div>

      {/* BJJ belt progression bar — unchanged */}
      {hoursUntilNext !== Infinity && (
        <Card className={compact ? 'p-2' : 'p-3'}>
          <div className="text-xs font-semibold text-muted mb-1.5">Next milestone</div>
          <div className="bg-border rounded-full h-2 overflow-hidden">
            <div
              className="bg-accent h-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="text-xs text-muted mt-1.5 text-center">
            {hoursUntilNext}h to go
          </div>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Type-check**

```bash
node_modules/.bin/tsc --noEmit 2>&1 || npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 5: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: `✓ built in` with no TypeScript errors.

- [ ] **Step 6: Visual verification**

```bash
npm run dev
```

Open `http://localhost:5173`. Navigate to Today and Profile pages.

Verify:
- Two vertical bars appear flanking the avatar sprite
- Left bar is green, labelled MOB
- Right bar is blue, labelled CAL
- Bars are the same height as the sprite
- Both bars animate smoothly (transition-all duration-700)
- If no training logged: both bars are at 0 (dark container visible, no fill)
- The existing "Next milestone" BJJ bar is still present below, unchanged
- Layout looks correct on both Today and Profile pages

- [ ] **Step 7: Commit**

```bash
git add src/components/AvatarDisplay.tsx
git commit -m "feat: add vertical MOB/CAL training bars flanking avatar sprite"
```

---

## Post-Implementation

Push to origin:
```bash
git push origin main
```
