// Chuỗi riêng của Bộ "Món ăn".
export const foodCopy = {
  setLabel: 'Món ăn',
  groups: { man: 'Mặn', rau: 'Rau', canh: 'Canh' },
  seasonFacet: 'Mùa',
  seasons: { xuan: 'Xuân', ha: 'Hạ', thu: 'Thu', dong: 'Đông', 'quanh-nam': 'Quanh năm' },
  emptySlot: (group: string) => `Hết món ${group} mùa này rồi 😅`,
  changeFilter: 'Đổi mùa',
  ingredients: 'Nguyên liệu',
  steps: 'Các bước',
  note: 'Ghi chú',
} as const
