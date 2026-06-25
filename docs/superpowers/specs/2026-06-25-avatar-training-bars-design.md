# Avatar Training Bars — Design Spec
_2026-06-25_

## Overview

Add two vertical progress bars flanking the avatar sprite, styled after the Life/Mana bars in Diablo. Green (left) = Mobility, Blue (right) = Calisthenics. They represent how consistently the user has been training in each category — they fill with effective hours and decay when training lapses.

---

## Data Model

### Source
`computeTrainingHours(category)` in `src/lib/trainingHourCalculator.ts` already returns `activeHours` — total logged hours adjusted for a 5%/week decay during inactivity. This is the exact semantic the user described: "0 if untrained, 100% if training constantly, loses points when slacking."

### Normalization
- **Cap**: 30 effective hours = 100%
- **Formula**: `pct = Math.min(100, Math.round((activeHours / 30) * 100))`
- At ~3 sessions/week × 45 min, a user fills the bar in ~3 months of consistent training.
- If they stop, the bar visibly drops (5%/week decay → bar loses ~1.67 percentage points/week).

### New hook: `useTrainingBars`
**File**: `src/hooks/useTrainingBars.ts`

```ts
export interface TrainingBars {
  mobilityPct: number    // 0–100
  calisthenicsPct: number // 0–100
}
```

Uses `useLiveQuery` to call `computeTrainingHours('mobility')` and `computeTrainingHours('calisthenics')` in parallel. Returns `{ mobilityPct: 0, calisthenicsPct: 0 }` as the loading default so bars render immediately at 0 and fill in.

---

## Component Design

### `VerticalBar` (inline in `AvatarDisplay.tsx`)

| Prop    | Type   | Description              |
|---------|--------|--------------------------|
| `value` | number | 0–100                    |
| `color` | string | hex fill color           |
| `label` | string | short label shown below  |
| `height`| number | px — matches sprite height |

**Structure:**
```
┌──────────┐  ← dark container (bg-border, rounded-full, w-2.5)
│          │
│          │
│██████████│  ← colored fill, grows from bottom (transform-origin: bottom)
│██████████│    transition-all duration-700
│██████████│    subtle lighter top edge (inner glow via box-shadow)
└──────────┘
  MOB / CAL   ← text-[9px] font-bold text-muted, centered below
```

Fill is achieved with `position: absolute, bottom: 0, height: ${value}%` inside a `position: relative` container. Rounded top on the fill when value > 0.

### `SpriteAvatarDisplay` layout change

Current structure (vertical stack):
```
sprite → description text → [Next milestone card]
```

New structure:
```
flex row:
  [VerticalBar mobility, green]
  flex-col: sprite + description text   ← center, flex-1
  [VerticalBar calisthenics, blue]
[Next milestone card]  ← below the row, unchanged
```

Bar height matches the rendered sprite container height. In compact mode the sprite is scaled 2.5× from 64px = ~160px rendered; bars match this.

---

## Visual Spec

| Element          | Value                        |
|------------------|------------------------------|
| Mobility color   | `#22c55e` (green — calendar calisthenics ring, repurposed per user intent) |
| Calisthenics color | `#3b82f6` (blue — calendar mobility ring, repurposed per user intent) |
| Bar width        | `10px` (w-2.5)               |
| Bar height       | matches sprite rendered height (~160px compact) |
| Container bg     | `bg-border` (`#2e3248`)      |
| Fill transition  | `transition-all duration-700 ease-out` |
| Top glow         | `box-shadow: inset 0 2px 4px rgba(255,255,255,0.15)` on fill |
| Label            | `text-[9px] font-bold uppercase text-muted`, centered below bar |
| Gap between bar and sprite | `gap-2` (8px) |

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useTrainingBars.ts` | New hook |
| `src/components/AvatarDisplay.tsx` | Add `VerticalBar` component; update `SpriteAvatarDisplay` layout |

No changes to `trainingHourCalculator.ts`, `useAvatarProgression.ts`, or any pages — the bars are entirely self-contained within `AvatarDisplay`.

---

## Out of Scope

- BJJ bar: the existing "Next milestone" horizontal bar already covers BJJ belt progression. No changes.
- `ProceduralAvatarDisplay` (SVG fallback): not updated — it is only shown when avatar images are missing and is not the active display path.
- Compact vs full mode: only `compact={true}` is currently used in the app (Today + Profile). The bars are designed for compact; full mode inherits the same layout and will look proportionally larger.
