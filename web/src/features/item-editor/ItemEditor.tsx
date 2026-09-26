import { useEffect, useRef, useState, type FormEvent } from 'react'
import { newId } from '../../data/ids'
import { useCreateItem } from '../../data/items'
import type { Rarity } from '../../engine'
import type { SetDefinition } from '../../sets/types'
import { ChipGroup } from '../../ui/ChipGroup'
import { copy } from '../../ui/copy'
import { Modal } from '../../ui/Modal'
import { rarityColor } from '../../ui/RarityBadge'
import { showToast } from '../../ui/toast'
import { ImagePicker, type PickedImage } from './ImagePicker'
import './ItemEditor.css'

export type EditorPrefill = {
  name?: string
  groupKey?: string
  /** facetKey → giá trị */
  facets?: Readonly<Record<string, string>>
}

type Props = {
  set: SetDefinition
  prefill?: EditorPrefill
  onClose: () => void
}

type FormState = {
  name: string
  groupKey: string | null
  facets: Record<string, string>
  rarity: Rarity
  attrs: unknown
  image: PickedImage
}

function initialState(set: SetDefinition, prefill: EditorPrefill = {}): FormState {
  return {
    name: prefill.name ?? '',
    groupKey: prefill.groupKey && set.groups.some((g) => g.key === prefill.groupKey) ? prefill.groupKey : null,
    facets: Object.fromEntries(
      set.facets.map((f) => {
        const wanted = prefill.facets?.[f.key]
        const fallback = f.universalValue ?? f.values[0]?.key ?? ''
        return [f.key, wanted && f.values.some((v) => v.key === wanted) ? wanted : fallback]
      }),
    ),
    rarity: 1,
    attrs: set.emptyAttrs(),
    image: null,
  }
}

const RARITY_OPTIONS = ([1, 2, 3] as const).map((r) => ({
  key: String(r),
  label: `${copy.rarity[r].stars} ${copy.rarity[r].label}`,
  color: rarityColor[r],
}))

/** Form Thêm món trong một modal toàn màn hình (một lớp). */
export function ItemEditor({ set, prefill, onClose }: Props) {
  const [initial] = useState(() => initialState(set, prefill))
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<{ name?: string; group?: string }>({})
  const [confirming, setConfirming] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  // ID sinh một lần: thử lại sau lỗi dùng lại đúng ID này
  const [id] = useState(newId)
  const create = useCreateItem(set.setKey)
  const nameRef = useRef<HTMLInputElement>(null)
  const groupRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const AttrsEditor = set.AttrsEditor
  const dirty = JSON.stringify({ ...form, image: form.image?.previewUrl ?? null }) !== JSON.stringify({ ...initial, image: null })

  // Bỏ URL xem trước khi đóng form
  const imageRef = useRef(form.image)
  useEffect(() => {
    imageRef.current = form.image
  }, [form.image])
  useEffect(() => () => {
    if (imageRef.current) URL.revokeObjectURL(imageRef.current.previewUrl)
  }, [])
  // Đang lưu hoặc đang sửa ảnh: không lưu/đóng được
  const busy = create.isPending || imageBusy

  // Đang sửa dở mà đóng/tải lại tab: trình duyệt hỏi lại
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // trình duyệt cũ cần returnValue mới hiện hộp hỏi
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  function requestClose() {
    if (busy) return
    // Đang hỏi "Bỏ thay đổi?" mà bấm Esc/chạm nền: coi như "Ở lại"
    if (confirming) return stay()
    if (dirty) setConfirming(true)
    else onClose()
  }

  function stay() {
    setConfirming(false)
    // Form vẽ lại: đưa focus về ô Tên để không rơi ra ngoài dialog
    requestAnimationFrame(() => nameRef.current?.focus())
  }

  function update(patch: Partial<FormState>) {
    setForm((f) => ({ ...f, ...patch }))
    if (patch.name !== undefined && errors.name) setErrors((e) => ({ ...e, name: undefined }))
    if (patch.groupKey !== undefined && errors.group) setErrors((e) => ({ ...e, group: undefined }))
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy || !create.ready) return
    const next = {
      name: form.name.trim() ? undefined : copy.editor.nameMissing,
      group: form.groupKey ? undefined : copy.editor.groupMissing,
    }
    setErrors(next)
    if (next.name || next.group) create.reset()
    if (next.name) return nameRef.current?.focus()
    if (next.group) return groupRef.current?.querySelector<HTMLElement>('[role="radio"]')?.focus()

    const parsed = set.parseAttrs(form.attrs)
    create.mutate(
      {
        id,
        groupKey: form.groupKey!,
        name: form.name,
        rarity: form.rarity,
        tags: Object.values(form.facets).filter(Boolean),
        // Trình soạn của Bộ luôn cho ra attrs đúng dạng; nếu không thì lưu công thức rỗng đã chuẩn hoá
        attrs: parsed.ok ? parsed.value : (set.parseAttrs(set.emptyAttrs()) as { value: unknown }).value,
        image: form.image?.file ?? null,
      },
      {
        onSuccess: () => {
          showToast(copy.editor.saved)
          onClose()
        },
      },
    )
  }

  const groupOptions = set.groups.map((g) => ({ key: g.key, label: g.label, color: g.color }))

  return (
    <Modal label={copy.editor.addTitle} onClose={requestClose} locked={busy} initialFocusRef={titleRef}>
      <div className="item-editor">
        {confirming ? (
          <div className="item-editor__confirm" role="alertdialog" aria-labelledby="discard-title" aria-describedby="discard-body">
            <h2 id="discard-title" className="item-editor__title" tabIndex={-1} ref={(el) => el?.focus()}>
              {copy.editor.discardTitle}
            </h2>
            <p id="discard-body">{copy.editor.discardBody}</p>
            <div className="item-editor__actions">
              <button type="button" className="button-secondary" onClick={stay}>
                {copy.editor.stay}
              </button>
              <button type="button" className="button-danger" onClick={onClose}>
                {copy.editor.discard}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <fieldset className="item-editor__fields" disabled={create.isPending}>
              <h2 className="item-editor__title" tabIndex={-1} ref={titleRef}>
                {copy.editor.addTitle}
              </h2>

              <ImagePicker
                value={form.image}
                onChange={(image) => update({ image })}
                disabled={create.isPending}
                onBusyChange={setImageBusy}
              />

              <div className="field">
                <label className="field__label" htmlFor="editor-name">
                  {copy.editor.name}
                </label>
                <input
                  id="editor-name"
                  ref={nameRef}
                  className="input"
                  value={form.name}
                  placeholder={copy.editor.namePlaceholder}
                  maxLength={200}
                  aria-invalid={!!errors.name || undefined}
                  aria-describedby={errors.name ? 'editor-name-error' : undefined}
                  onChange={(e) => update({ name: e.target.value })}
                />
                {errors.name && (
                  <span id="editor-name-error" className="form-error">
                    {errors.name}
                  </span>
                )}
              </div>

              <div className="field">
                <span className="field__label" aria-hidden="true">
                  {copy.editor.group}
                </span>
                <ChipGroup
                  ref={groupRef}
                  label={copy.editor.group}
                  options={groupOptions}
                  value={form.groupKey ?? ''}
                  onChange={(groupKey) => update({ groupKey })}
                  invalid={!!errors.group}
                  describedBy={errors.group ? 'editor-group-error' : undefined}
                />
                {errors.group && (
                  <span id="editor-group-error" className="form-error">
                    {errors.group}
                  </span>
                )}
              </div>

              {set.facets.map((f) => (
                <div className="field" key={f.key}>
                  <span className="field__label">{f.label}</span>
                  <ChipGroup
                    label={f.label}
                    options={f.values}
                    value={form.facets[f.key]}
                    onChange={(v) => update({ facets: { ...form.facets, [f.key]: v } })}
                  />
                </div>
              ))}

              <div className="field">
                <span className="field__label">{copy.editor.rarity}</span>
                <ChipGroup
                  label={copy.editor.rarity}
                  options={RARITY_OPTIONS}
                  value={String(form.rarity)}
                  onChange={(v) => update({ rarity: Number(v) as Rarity })}
                />
              </div>

              <AttrsEditor value={form.attrs} onChange={(attrs) => update({ attrs })} disabled={create.isPending} />
            </fieldset>

            {create.error && (
              <div className="item-editor__error" role="alert">
                <p>{create.error.message}</p>
                <button type="submit" className="button-secondary" disabled={busy}>
                  {copy.retry}
                </button>
              </div>
            )}

            <div className="item-editor__actions item-editor__actions--sticky">
              <button type="button" className="button-secondary" onClick={requestClose} disabled={busy}>
                {copy.editor.cancel}
              </button>
              <button type="submit" className="button-primary" disabled={busy || !create.ready}>
                {create.isPending ? copy.editor.saving : copy.editor.save}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
