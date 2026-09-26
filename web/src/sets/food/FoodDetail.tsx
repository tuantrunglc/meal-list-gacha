import { parseFoodAttrs } from './attrs'
import { foodCopy } from './copy'
import './FoodDetail.css'

/** Công thức món: Nguyên liệu, Các bước (đánh số), Ghi chú. Phần rỗng thì không hiện. */
export function FoodDetail({ attrs }: { attrs: unknown }) {
  const parsed = parseFoodAttrs(attrs)
  if (!parsed.ok) return null
  // Bỏ dòng trống (người dùng gõ dư) để phần rỗng thật sự không hiện
  const clean = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean)
  const ingredients = clean(parsed.value.ingredients)
  const steps = clean(parsed.value.steps)
  const note = parsed.value.note?.trim()
  return (
    <div className="food-detail">
      {ingredients.length === 0 && steps.length === 0 && <p className="food-detail__empty">{foodCopy.noRecipe}</p>}
      {ingredients.length > 0 && (
        <section>
          <h3 className="food-detail__heading">{foodCopy.ingredients}</h3>
          <ul className="food-detail__ingredients">
            {ingredients.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>
      )}
      {steps.length > 0 && (
        <section>
          <h3 className="food-detail__heading">{foodCopy.steps}</h3>
          <ol className="food-detail__steps">
            {steps.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ol>
        </section>
      )}
      {note && (
        <section>
          <h3 className="food-detail__heading">{foodCopy.note}</h3>
          <p>{note}</p>
        </section>
      )}
    </div>
  )
}
