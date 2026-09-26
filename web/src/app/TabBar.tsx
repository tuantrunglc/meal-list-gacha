import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { copy } from '../ui/copy'
import './TabBar.css'

type Tab = { to: string; label: string; icon: ReactNode; end?: boolean }

const iconProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const

const tabs: Tab[] = [
  {
    to: '/',
    end: true,
    label: copy.tabBar.spin,
    // nồi có nắp
    icon: (
      <svg {...iconProps}>
        <path d="M4 11h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z" />
        <path d="M6 8h12" />
        <path d="M12 5v3" />
      </svg>
    ),
  },
  {
    to: '/mon-an',
    label: copy.tabBar.library,
    // bát cơm
    icon: (
      <svg {...iconProps}>
        <path d="M3 11h18a9 9 0 0 1-18 0z" />
        <path d="M8 11a4 4 0 0 1 8 0" />
      </svg>
    ),
  },
  {
    to: '/lich-su',
    label: copy.tabBar.history,
    // lịch
    icon: (
      <svg {...iconProps}>
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M4 10h16M9 3v4M15 3v4" />
      </svg>
    ),
  },
]

export function TabBar() {
  return (
    <nav className="tab-bar" aria-label={copy.tabBar.label}>
      <ul className="tab-bar__list">
        {tabs.map((tab) => (
          <li key={tab.to} className="tab-bar__item">
            <NavLink to={tab.to} end={tab.end} className="tab-bar__link">
              {tab.icon}
              <span className="tab-bar__label">{tab.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
