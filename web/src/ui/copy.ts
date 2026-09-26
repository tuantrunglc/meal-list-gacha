// Chuỗi hiển thị dùng chung. Chuỗi riêng của một Bộ nằm ở sets/<setKey>/copy.ts.
export const copy = {
  tabBar: {
    label: 'Điều hướng chính',
    spin: 'Quay',
    library: 'Món ăn',
    history: 'Lịch sử',
  },
  /** Nhãn độ hiếm dùng chung mọi Bộ; luôn đi kèm số sao. */
  rarity: {
    1: { stars: '⭐', label: 'Thường' },
    2: { stars: '⭐⭐', label: 'Ngon' },
    3: { stars: '⭐⭐⭐', label: 'Đặc biệt' },
  },
  screens: {
    spin: 'Mở nồi',
    library: 'Sổ món của nhà',
    history: 'Mâm đã chốt',
  },
} as const
