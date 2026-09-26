import { useId, useRef } from 'react'
import { useDeleteItem, type Item } from '../../data/items'
import { copy } from '../../ui/copy'
import { Modal } from '../../ui/Modal'
import { showToast } from '../../ui/toast'
import './DeleteItemConfirm.css'

type Props = {
  item: Item
  setKey: string
  /** Người dùng thôi không xoá. */
  onCancel: () => void
  /** Đã xoá xong. */
  onDeleted: () => void
}

/** Xác nhận xoá món (xoá mềm) trong một modal; nút xoá màu danger. */
export function DeleteItemConfirm({ item, setKey, onCancel, onDeleted }: Props) {
  const del = useDeleteItem(setKey)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const busy = del.isPending || !del.ready
  const bodyId = useId()

  function confirm() {
    if (busy) return
    del.mutate(item.id, {
      onSuccess: () => {
        showToast(copy.editor.deleted)
        onDeleted()
      },
    })
  }

  return (
    <Modal
      label={copy.editor.deleteTitle(item.name)}
      role="alertdialog"
      describedBy={bodyId}
      onClose={onCancel}
      locked={busy}
      initialFocusRef={titleRef}
    >
      <div className="delete-confirm">
        <h2 className="delete-confirm__title" tabIndex={-1} ref={titleRef}>
          {copy.editor.deleteTitle(item.name)}
        </h2>
        <p id={bodyId}>{copy.editor.deleteBody}</p>
        {del.error && (
          <p className="form-error" role="alert">
            {del.error.message}
          </p>
        )}
        <div className="delete-confirm__actions">
          <button type="button" className="button-secondary" onClick={onCancel} disabled={busy}>
            {copy.editor.cancel}
          </button>
          <button type="button" className="button-danger" onClick={confirm} disabled={busy}>
            {busy ? copy.editor.deleting : del.error ? copy.retry : copy.editor.deleteConfirm}
          </button>
        </div>
      </div>
    </Modal>
  )
}
