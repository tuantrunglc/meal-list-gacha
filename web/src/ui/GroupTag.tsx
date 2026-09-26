import './tags.css'

/** Nhãn nhóm món (Mặn/Rau/Canh…): viên thuốc nhỏ màu nhóm. */
export function GroupTag({ label, color }: { label: string; color: string }) {
  return (
    <span className="group-tag" style={{ background: color }}>
      {label}
    </span>
  )
}
