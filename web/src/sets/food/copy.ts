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
  ingredientLine: (n: number) => `Nguyên liệu ${n}`,
  addIngredient: '＋ Thêm nguyên liệu',
  removeIngredient: (n: number) => `Bỏ nguyên liệu ${n}`,
  stepLine: (n: number) => `Bước ${n}`,
  addStep: '＋ Thêm bước',
  removeStep: (n: number) => `Bỏ bước ${n}`,
  notePlaceholder: 'Mẹo nhỏ của nhà mình (không bắt buộc)',
} as const
