import { useId, useRef } from 'react'
import { copy } from './copy'
import { Modal } from './Modal'
import './ConfirmDialog.css'

type Props = {
  title: string
  body: string
  confirmLabel: string
  busyLabel: string
  busy: boolean
  /** Lời nhắn lỗi (đã thân thiện); có thì nút xác nhận thành "Thử lại". */
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
  /** Chưa xác nhận được (ví dụ đang chờ tải) nhưng vẫn huỷ được. */
  confirmDisabled?: boolean
}

/** Hộp xác nhận hành động không hoàn tác (xoá): một lớp modal, nút xác nhận màu danger. */
export function ConfirmDialog({ title, body, confirmLabel, busyLabel, busy, error, onConfirm, onCancel, confirmDisabled = false }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const bodyId = useId()
  return (
    <Modal label={title} role="alertdialog" describedBy={bodyId} onClose={onCancel} locked={busy} initialFocusRef={titleRef}>
      <div className="confirm-dialog">
        <h2 className="confirm-dialog__title" tabIndex={-1} ref={titleRef}>
          {title}
        </h2>
        <p id={bodyId}>{body}</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="confirm-dialog__actions">
          <button type="button" className="button-secondary" onClick={onCancel} disabled={busy}>
            {copy.common.cancel}
          </button>
          <button
            type="button"
            className="button-danger"
            // chặn bấm hai lần trước khi nút kịp khoá
            onClick={() => !busy && !confirmDisabled && onConfirm()}
            disabled={busy || confirmDisabled}
          >
            {busy ? busyLabel : error ? copy.retry : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
