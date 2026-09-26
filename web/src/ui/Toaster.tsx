import { useEffect } from 'react'
import { useToast } from './toast'
import './Toaster.css'

const DURATION_MS = 3000

/** Thông báo ngắn (ví dụ "Đã lưu vào nồi!"), tự ẩn. */
export function Toaster() {
  const { message, id, hide } = useToast()

  useEffect(() => {
    if (!message) return
    const t = window.setTimeout(hide, DURATION_MS)
    return () => window.clearTimeout(t)
  }, [message, id, hide])

  return (
    // Vùng live luôn có sẵn; role=status chỉ có khi đang hiện để không lẫn với trạng thái khác của màn
    <div className="toaster" aria-live="polite">
      {message && (
        <p key={id} className="toast" role="status">
          {message}
        </p>
      )}
    </div>
  )
}
