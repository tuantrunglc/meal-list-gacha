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
  login: {
    title: 'Nồi Thần',
    subtitle: 'Cả nhà đăng nhập một lần là nồi nhớ luôn.',
    email: 'Email',
    password: 'Mật khẩu',
    submit: 'Vào bếp thôi!',
    submitting: 'Đang mở cửa bếp…',
  },
  dishImage: {
    empty: 'Thêm ảnh',
  },
  retry: 'Thử lại',
  screens: {
    spin: 'Mở nồi',
    library: 'Sổ món của nhà',
    history: 'Mâm đã chốt',
  },
} as const
