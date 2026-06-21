import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Today', icon: '☀️' },
  { to: '/mobility', label: 'Mobility', icon: '🧘' },
  { to: '/recovery', label: 'Recovery', icon: '🪻' },
  { to: '/progress', label: 'Progress', icon: '📈' },
  { to: '/profile', label: 'Profile', icon: '⚙️' }
]

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-md items-stretch">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${
                isActive ? 'text-accent' : 'text-muted'
              }`
            }
          >
            <span className="text-2xl leading-none">{tab.icon}</span>
            <span className="text-[11px]">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
