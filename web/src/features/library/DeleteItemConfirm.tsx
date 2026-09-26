import { useDeleteItem, type Item } from '../../data/items'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { copy } from '../../ui/copy'
import { showToast } from '../../ui/toast'

type Props = {
  item: Item
  setKey: string
  /** Người dùng thôi không xoá. */
  onCancel: () => void
  /** Đã xoá xong. */
  onDeleted: () => void
}

/** Xác nhận xoá món (xoá mềm). */
export function DeleteItemConfirm({ item, setKey, onCancel, onDeleted }: Props) {
  const del = useDeleteItem(setKey)
  return (
    <ConfirmDialog
      title={copy.editor.deleteTitle(item.name)}
      body={copy.editor.deleteBody}
      confirmLabel={copy.editor.deleteConfirm}
      busyLabel={copy.editor.deleting}
      busy={del.isPending}
      confirmDisabled={!del.ready}
      error={del.error?.message}
      onCancel={onCancel}
      onConfirm={() =>
        del.mutate(item.id, {
          onSuccess: () => {
            showToast(copy.editor.deleted)
            onDeleted()
          },
        })
      }
    />
  )
}
