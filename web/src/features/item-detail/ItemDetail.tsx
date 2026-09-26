import { forwardRef } from 'react'
import { useItemImages } from '../../data/files'
import type { Item } from '../../data/items'
import type { SetDefinition } from '../../sets/types'
import { DishImage } from '../../ui/DishImage'
import { GroupTag } from '../../ui/GroupTag'
import { RarityBadge } from '../../ui/RarityBadge'
import './ItemDetail.css'

type Props = { item: Item; set: SetDefinition }

/** Chi tiết món: phần chung (ảnh, tên, nhóm, độ hiếm, facet) + phần riêng của Bộ. Tên món nhận focus. */
export const ItemDetail = forwardRef<HTMLHeadingElement, Props>(function ItemDetail({ item, set }, headingRef) {
  const group = set.groups.find((g) => g.key === item.groupKey)
  const imagesOf = useItemImages()
  const DetailView = set.DetailView
  const facetValues = set.facets.flatMap((f) =>
    f.values.filter((v) => item.tags.includes(v.key)).map((v) => ({ ...v, id: `${f.key}:${v.key}`, facetLabel: f.label })),
  )

  return (
    <article className="item-detail">
      <DishImage className="item-detail__image" sources={imagesOf(item, 'full')} alt={item.name} />
      <h2 className="item-detail__name" ref={headingRef} tabIndex={-1}>
        {item.name}
      </h2>
      <div className="item-detail__meta">
        {group && <GroupTag label={group.label} color={group.color} />}
        <RarityBadge rarity={item.rarity} />
        {facetValues.map((v) => (
          <span key={v.id} className="item-detail__facet">
            <span className="item-detail__dot" style={{ background: v.color }} aria-hidden="true" />
            {v.facetLabel}: {v.label}
          </span>
        ))}
      </div>
      <DetailView attrs={item.attrs} />
    </article>
  )
})
