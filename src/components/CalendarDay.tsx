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
  if (load >= 70) return '#e8622a' // intense orange
  if (load >= 30) return '#f5c842' // medium amber
  return '#7a7d96' // light gray
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
  const ringRadius = 28
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringStrokeDashoffset = ringCircumference * (1 - load.overallLoad / 100)

  return (
    <div
      className={`relative aspect-square flex flex-col items-center justify-center rounded-lg border-2 transition cursor-pointer ${
        isCurrentMonth ? 'bg-bg' : 'bg-bg-alt'
      } ${isToday ? 'border-accent ring-2 ring-accent ring-offset-2' : 'border-border'} ${
        isSelected ? 'ring-2 ring-offset-2' : ''
      }`}
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Load ring SVG */}
      <svg width="60" height="60" viewBox="0 0 60 60" className="absolute inset-0">
        {/* Background ring */}
        <circle
          cx="30"
          cy="30"
          r={ringRadius}
          fill="none"
          stroke="#2e3248"
          strokeWidth="1.5"
          opacity="0.2"
        />
        {/* Progress ring */}
        <circle
          cx="30"
          cy="30"
          r={ringRadius}
          fill="none"
          stroke={ringColor}
          strokeWidth="2"
          strokeDasharray={ringCircumference}
          strokeDashoffset={ringStrokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          transform="rotate(-90 30 30)"
        />
      </svg>

      {/* Day number and month */}
      <div className="relative z-10 text-center">
        <div className="text-sm font-bold">{date.getDate()}</div>
        <div className="text-[10px] text-muted">{monthAbbr}</div>
      </div>

      {/* Hover tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-ink text-bg rounded-lg p-2 text-xs whitespace-nowrap z-50 shadow-lg">
          <div>BJJ: {load.breakdown.bjjTechnicalMins} min</div>
          <div>Calisthenics: {Math.round(load.breakdown.calisthenicsMinutes)} min ({load.calisthenicsLoad}%)</div>
          <div>Mobility: {Math.round(load.breakdown.mobilityMinutes)} min</div>
        </div>
      )}
    </div>
  )
}
