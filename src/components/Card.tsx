import type { ReactNode, CSSProperties } from 'react'

export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 shadow-sm ${className}`} style={style}>
      {children}
    </div>
  )
}

export function Tag({ children, color = '#2ec4b6' }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: color + '22', color, border: `1px solid ${color}44` }}
    >
      {children}
    </span>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 text-base font-bold text-ink">{children}</h2>
}
