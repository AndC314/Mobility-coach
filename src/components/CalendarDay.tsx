import { useState } from 'react'
import type { DailyLoad } from '../lib/loadCalculation'

interface CalendarDayProps {
  date: Date
  dateIso: string
  load: DailyLoad
  isCurrentMonth: boolean
  isToday: boolean
  isSelected?: boolean
  onClick?: () => void
}

function getRingColor(load: number): string {
  if (load >= 70) return '#e8622a'
  if (load >= 30) return '#f5c842'
  return '#7a7d96'
}

export default function CalendarDay({
  date,
  dateIso,
  load,
  isCurrentMonth,
  isToday,
  isSelected,
  onClick
}: CalendarDayProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const monthAbbr = date.toLocaleString('default', { month: 'short' }).toUpperCase()

  const ringColor = getRingColor(load.overallLoad)
  const ringRadius = 26
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringStrokeDashoffset = ringCircumference * (1 - load.overallLoad / 100)

  const hasBjj = load.bjjLoad > 0 || load.breakdown.bjjClassCount > 0
  const hasCal = load.calisthenicsLoad > 0
  const hasMob = load.mobilityLoad > 0

  return (
    <div
      className={`relative w-full aspect-square rounded-lg border-2 transition cursor-pointer ${
        isCurrentMonth ? 'bg-bg' : 'bg-bg-alt'
      } ${isToday ? 'border-accent ring-2 ring-accent ring-offset-2' : 'border-border'} ${
        isSelected ? 'ring-2 ring-offset-2' : ''
      }`}
      style={{ display: 'grid' }}
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Load ring — CSS grid overlay fills cell exactly */}
      <svg
        viewBox="0 0 60 60"
        aria-hidden
        style={{ gridArea: '1/1', width: '100%', display: 'block' }}
      >
        <circle
          cx="30" cy="30" r={ringRadius}
          fill="none" stroke="#2e3248" strokeWidth="2" opacity="0.2"
        />
        <circle
          cx="30" cy="30" r={ringRadius}
          fill="none" stroke={ringColor} strokeWidth="2.5"
          strokeDasharray={ringCircumference}
          strokeDashoffset={ringStrokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          transform="rotate(-90 30 30)"
        />
      </svg>

      {/* Day label — stacked over ring via same grid area */}
      <div
        style={{ gridArea: '1/1' }}
        className="flex flex-col items-center justify-center z-10"
      >
        <span className="text-sm font-bold leading-none">{date.getDate()}</span>
        <span className="text-[10px] text-muted leading-none mt-0.5">{monthAbbr}</span>
      </div>

      {/* Activity dots */}
      {isCurrentMonth && (hasBjj || hasCal || hasMob) && (
        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-0.5 z-10">
          {hasBjj && <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#2ec4b6' }} />}
          {hasCal && <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#e8622a' }} />}
          {hasMob && <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#a78bfa' }} />}
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && (load.overallLoad > 0 || hasBjj) && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-ink text-bg rounded-lg p-2 text-xs whitespace-nowrap z-50 shadow-lg">
          {hasBjj && (
            <div>BJJ: {load.breakdown.bjjTechnicalMins}T / {load.breakdown.bjjSparringMins}S min</div>
          )}
          {hasCal && (
            <div>Calisthenics: {Math.round(load.breakdown.calisthenicsMinutes)} min ({load.calisthenicsLoad}%)</div>
          )}
          {hasMob && (
            <div>Mobility: {Math.round(load.breakdown.mobilityMinutes)} min</div>
          )}
        </div>
      )}
    </div>
  )
}
