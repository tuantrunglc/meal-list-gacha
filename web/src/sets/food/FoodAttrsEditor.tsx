import { useRef } from 'react'
import type { FoodAttrs } from './attrs'
import { foodCopy } from './copy'
import './FoodAttrsEditor.css'

type Props = { value: FoodAttrs; onChange: (value: FoodAttrs) => void; disabled?: boolean }

const MAX_LINES = 60

type ListProps = {
  heading: string
  items: string[]
  numbered: boolean
  lineLabel: (n: number) => string
  addLabel: string
  removeLabel: (n: number) => string
  onChange: (items: string[]) => void
  disabled?: boolean
}

function LineList({ heading, items: raw, numbered, lineLabel, addLabel, removeLabel, onChange, disabled }: ListProps) {
  // Danh sách rỗng (món chưa có công thức) vẫn có một dòng để gõ
  const items = raw.length > 0 ? raw : ['']
  const listRef = useRef<HTMLOListElement>(null)
  const Tag = numbered ? 'ol' : 'ul'

  function focusLine(index: number) {
    // Đợi React vẽ dòng mới rồi mới focus
    requestAnimationFrame(() => listRef.current?.querySelectorAll('input')[index]?.focus())
  }

  return (
    <fieldset className="food-editor__list" disabled={disabled}>
      <legend className="food-editor__heading">{heading}</legend>
      <Tag className="food-editor__lines" ref={listRef as never}>
        {items.map((text, i) => (
          <li key={i} className="food-editor__line">
            {numbered && (
              <span className="food-editor__number" aria-hidden="true">
                {i + 1}.
              </span>
            )}
            <input
              className="input"
              aria-label={lineLabel(i + 1)}
              value={text}
              maxLength={300}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              onKeyDown={(e) => {
                // Enter ở dòng cuối: thêm dòng mới cho nhanh
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  if (i === items.length - 1 && items.length < MAX_LINES) onChange([...items, ''])
                  focusLine(i + 1)
                }
              }}
            />
            <button
              type="button"
              className="food-editor__remove"
              aria-label={removeLabel(i + 1)}
              onClick={() => {
                onChange(items.length === 1 ? [''] : items.filter((_, j) => j !== i))
                focusLine(Math.max(0, i - 1))
              }}
            >
              <span aria-hidden="true">✕</span>
            </button>
          </li>
        ))}
      </Tag>
      <button
        type="button"
        className="button-secondary food-editor__add"
        // Giới hạn số dòng để công thức không vượt dung lượng lưu trên server
        disabled={disabled || items.length >= MAX_LINES}
        onClick={() => {
          onChange([...items, ''])
          focusLine(items.length)
        }}
      >
        {addLabel}
      </button>
    </fieldset>
  )
}

/** Trình soạn công thức của Bộ "Món ăn". */
export function FoodAttrsEditor({ value, onChange, disabled }: Props) {
  return (
    <div className="food-editor">
      <LineList
        heading={foodCopy.ingredients}
        items={value.ingredients}
        numbered={false}
        lineLabel={foodCopy.ingredientLine}
        addLabel={foodCopy.addIngredient}
        removeLabel={foodCopy.removeIngredient}
        onChange={(ingredients) => onChange({ ...value, ingredients })}
        disabled={disabled}
      />
      <LineList
        heading={foodCopy.steps}
        items={value.steps}
        numbered
        lineLabel={foodCopy.stepLine}
        addLabel={foodCopy.addStep}
        removeLabel={foodCopy.removeStep}
        onChange={(steps) => onChange({ ...value, steps })}
        disabled={disabled}
      />
      <label className="field">
        <span className="food-editor__heading">{foodCopy.note}</span>
        <textarea
          className="input food-editor__note"
          rows={3}
          placeholder={foodCopy.notePlaceholder}
          maxLength={2000}
          value={value.note ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
        />
      </label>
    </div>
  )
}
