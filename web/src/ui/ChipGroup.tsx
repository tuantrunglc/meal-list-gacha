import { forwardRef, useRef, type KeyboardEvent } from 'react'
import './ChipGroup.css'

export type ChipOption = { key: string; label: string; color: string }

type Props = {
  label: string
  options: readonly ChipOption[]
  value: string
  onChange: (key: string) => void
  /** Trường bắt buộc chưa chọn: đánh dấu lỗi và trỏ tới dòng báo lỗi. */
  invalid?: boolean
  describedBy?: string
}

/** Nhóm chip chọn một (radiogroup): mũi tên trái/phải để đổi, chip chọn tô nền. */
export const ChipGroup = forwardRef<HTMLDivElement, Props>(function ChipGroup(
  { label, options, value, onChange, invalid, describedBy },
  ref,
) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(e: KeyboardEvent, index: number) {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = (index + delta + options.length) % options.length
    onChange(options[next].key)
    buttons.current[next]?.focus()
  }

  return (
    <div
      className="chip-group"
      role="radiogroup"
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      ref={ref}
      tabIndex={-1}
    >
      {options.map((o, i) => {
        const selected = o.key === value
        // Giá trị không khớp lựa chọn nào: chip đầu vẫn nhận Tab để bàn phím vào được nhóm
        const tabbable = selected || (i === 0 && !options.some((x) => x.key === value))
        return (
          <button
            key={o.key}
            ref={(el) => {
              buttons.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={tabbable ? 0 : -1}
            className={`chip${selected ? ' chip--on' : ''}`}
            onClick={() => onChange(o.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            <span className="chip__dot" style={{ background: o.color }} aria-hidden="true" />
            {o.label}
          </button>
        )
      })}
    </div>
  )
})
