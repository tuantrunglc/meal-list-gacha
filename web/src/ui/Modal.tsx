import { useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import './Modal.css'

type Props = {
  label: string
  onClose: () => void
  children: ReactNode
  /** Không cho đóng (đang lưu…). */
  locked?: boolean
  /** Phần tử nhận focus khi mở (ví dụ tiêu đề); mặc định là dialog. */
  initialFocusRef?: RefObject<HTMLElement | null>
  /** 'alertdialog' cho hộp xác nhận (xoá, bỏ thay đổi). */
  role?: 'dialog' | 'alertdialog'
  describedBy?: string
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

/** Lớp modal duy nhất: focus vào dialog, giữ Tab bên trong, Esc/chạm nền đóng, trả focus về chỗ cũ. */
export function Modal({ label, onClose, children, locked = false, initialFocusRef, role = 'dialog', describedBy }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  const lockedRef = useRef(locked)
  useEffect(() => {
    closeRef.current = onClose
    lockedRef.current = locked
  })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ;(initialFocusRef?.current ?? ref.current)?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !lockedRef.current) closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      // Phần tử mở modal có thể đã bị gỡ (lọc/tải lại) thì thôi
      if (previous?.isConnected) previous.focus()
    }
    // chạy lúc mở/đóng (ref object không đổi)
  }, [initialFocusRef])

  function trapTab(e: KeyboardEvent) {
    if (e.key !== 'Tab' || !ref.current) return
    const nodes = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (nodes.length === 0) return
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="modal">
      <div className="modal__dim" aria-hidden="true" onClick={() => !locked && onClose()} />
      <div
        className="modal__dialog"
        role={role}
        aria-modal="true"
        aria-label={label}
        aria-describedby={describedBy}
        tabIndex={-1}
        ref={ref}
        onKeyDown={trapTab}
      >
        {children}
      </div>
    </div>
  )
}
