import { useMemo, useRef, useState } from 'react'
import { useItemImages } from '../../data/files'
import { useItems, type Item } from '../../data/items'
import { DEFAULT_SET_KEY, getSet } from '../../sets/registry'
import { ChipGroup } from '../../ui/ChipGroup'
import { copy } from '../../ui/copy'
import { DishCard } from '../../ui/DishCard'
import { Modal } from '../../ui/Modal'
import { ItemDetail } from '../item-detail/ItemDetail'
import { ItemEditor, type EditorPrefill } from '../item-editor/ItemEditor'
import { filterItems } from './filter'
import './LibraryScreen.css'

// Khoá "Tất cả" trong nhóm chip (không trùng key nào của Bộ vì key Bộ là kebab-case)
const ALL = '__all__'

export function LibraryScreen() {
  const set = getSet(DEFAULT_SET_KEY)
  const items = useItems(set)
  const imagesOf = useItemImages()
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState(ALL)
  const [facets, setFacets] = useState<Record<string, string>>(() =>
    Object.fromEntries(set.facets.map((f) => [f.key, ALL])),
  )
  const [openId, setOpenId] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorPrefill | null>(null)
  const detailHeading = useRef<HTMLHeadingElement>(null)
  const filtered = query.trim() === '' && (group !== ALL || Object.values(facets).some((v) => v !== ALL))

  function clearFilters() {
    setGroup(ALL)
    setFacets(Object.fromEntries(set.facets.map((f) => [f.key, ALL])))
  }

  const visible = useMemo(
    () =>
      filterItems(items.data ?? [], {
        groupKey: group === ALL ? null : group,
        facets: Object.fromEntries(Object.entries(facets).map(([k, v]) => [k, v === ALL ? null : v])),
        query,
      }),
    [items.data, group, facets, query],
  )
  const openItem = openId ? items.data?.find((i) => i.id === openId) : undefined

  const groupOptions = [
    { key: ALL, label: copy.library.all, color: 'var(--color-border-soft)' },
    ...set.groups.map((g) => ({ key: g.key, label: g.label, color: g.color })),
  ]

  function cardProps(item: Item) {
    const g = set.groups.find((x) => x.key === item.groupKey)
    const dots = set.facets.flatMap((f) => f.values.filter((v) => item.tags.includes(v.key)))
    return {
      name: item.name,
      imageSources: imagesOf(item, 'thumb'),
      group: g ? { label: g.label, color: g.color } : undefined,
      rarity: item.rarity,
      dots: dots.map((d) => ({ label: d.label, color: d.color })),
      label: copy.library.card(item.name, g?.label ?? '', copy.rarity[item.rarity].label, dots.map((d) => d.label).join(', ')),
      onOpen: () => setOpenId(item.id),
    }
  }

  return (
    <div className="library">
      <h1 className="screen-title">{copy.screens.library}</h1>

      <label className="field library__search">
        <span className="field__label">{copy.library.search}</span>
        <input
          className="input"
          type="search"
          value={query}
          placeholder={copy.library.searchPlaceholder}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
        />
      </label>

      <ChipGroup label={copy.library.groupFilter} options={groupOptions} value={group} onChange={setGroup} />
      {set.facets.map((f) => (
        <ChipGroup
          key={f.key}
          label={f.label}
          options={[{ key: ALL, label: copy.library.all, color: 'var(--color-border-soft)' }, ...f.values]}
          value={facets[f.key]}
          onChange={(v) => setFacets((cur) => ({ ...cur, [f.key]: v }))}
        />
      ))}

      {items.error && (
        // Có dữ liệu cũ thì vẫn hiện lưới, lỗi chỉ là dải thông báo
        <div className="library__error" role="alert">
          <p className="form-error">{items.error.message}</p>
          <button type="button" className="button-secondary" onClick={() => void items.refetch()}>
            {copy.retry}
          </button>
        </div>
      )}
      {items.error && !items.data ? null : !items.data ? (
        <p className="library__status" role="status">
          {copy.library.loading}
        </p>
      ) : visible.length === 0 && filtered ? (
        <div className="library__status" role="status">
          <p>{copy.library.noMatch}</p>
          <button type="button" className="button-secondary" onClick={clearFilters}>
            {copy.library.clearFilters}
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="library__status" role="status">
          <p>{copy.library.notFound}</p>
          <button type="button" className="button-secondary" onClick={() => setEditor({ name: query.trim(), groupKey: group !== ALL ? group : undefined })}>
            ＋ {copy.editor.addButton}
          </button>
        </div>
      ) : (
        <ul className="library__grid">
          {visible.map((item) => (
            <li key={item.id}>
              <DishCard {...cardProps(item)} />
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="library__add" aria-label={copy.editor.addButton} onClick={() => setEditor({})}>
        <span aria-hidden="true">＋</span>
      </button>

      {editor && <ItemEditor set={set} prefill={editor} onClose={() => setEditor(null)} />}

      {openItem && (
        <Modal label={copy.tray.detailTitle(openItem.name)} onClose={() => setOpenId(null)} initialFocusRef={detailHeading}>
          <button type="button" className="library__close" onClick={() => setOpenId(null)}>
            {copy.library.detailClose}
          </button>
          <ItemDetail item={openItem} set={set} ref={detailHeading} />
        </Modal>
      )}
    </div>
  )
}
