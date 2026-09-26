import './GachaPot.css'

/** Nồi đất (220px). `boiling`: sôi sùng sục, nắp nảy. Chỉ để trang trí. */
export function GachaPot({ boiling }: { boiling: boolean }) {
  return (
    <svg className={`gacha-pot${boiling ? ' gacha-pot--boiling' : ''}`} viewBox="0 0 220 220" aria-hidden="true" focusable="false">
      <g className="gacha-pot__steam">
        <path d="M80 40 q-8 -12 0 -24" />
        <path d="M110 34 q-8 -12 0 -24" />
        <path d="M140 40 q-8 -12 0 -24" />
      </g>
      <ellipse cx="110" cy="200" rx="80" ry="10" fill="var(--color-ink-primary)" opacity=".12" />
      <path d="M36 92 Q30 180 110 196 Q190 180 184 92 Z" fill="var(--color-accent-clay)" />
      <path d="M36 92 Q34 120 44 142 Q110 160 176 142 Q186 120 184 92 Z" fill="#B55A33" />
      <path d="M52 118 Q110 132 168 118" stroke="#E4A07A" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M36 104 q-20 0 -20 14 q0 10 16 8" stroke="#A64F2B" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M184 104 q20 0 20 14 q0 10 -16 8" stroke="#A64F2B" strokeWidth="8" fill="none" strokeLinecap="round" />
      <circle cx="86" cy="150" r="6" fill="var(--color-ink-primary)" />
      <circle cx="134" cy="150" r="6" fill="var(--color-ink-primary)" />
      <circle cx="88" cy="148" r="2" fill="#fff" />
      <circle cx="136" cy="148" r="2" fill="#fff" />
      <path d="M100 164 q10 9 20 0" stroke="var(--color-ink-primary)" strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="72" cy="166" rx="9" ry="5" fill="var(--color-season-spring)" opacity=".7" />
      <ellipse cx="148" cy="166" rx="9" ry="5" fill="var(--color-season-spring)" opacity=".7" />
      <g className="gacha-pot__lid">
        <ellipse cx="110" cy="90" rx="80" ry="16" fill="#A64F2B" />
        <path d="M40 88 Q110 40 180 88 Z" fill="#D07A4C" />
        <ellipse cx="110" cy="56" rx="14" ry="8" fill="#A64F2B" />
      </g>
    </svg>
  )
}
