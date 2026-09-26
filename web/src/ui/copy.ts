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
  spin: {
    setPicker: (label: string) => `Bộ: ${label}`,
    greeting: 'Nay ăn gì cả nhà?',
    firstHint: 'Mở thử đi cả nhà!',
    button: 'Mở nồi!',
    spinning: 'Nồi đang sôi…',
  },
  tray: {
    title: 'Mâm cơm',
    say: 'Nồi Thần dọn mâm!',
    close: 'Để sau',
    announce: (parts: string[]) => `Mâm cơm: ${parts.join('; ')}`,
    announcePart: (group: string, name: string, rarity: string) => `${group} ${name}, ${rarity}`,
    announceEmpty: (group: string) => `${group} hết món`,
    reroll: (name: string) => `Đổi món này: ${name}`,
    locked: (name: string) => `${name}: Đang giữ`,
    unlocked: (name: string) => `${name}: Không giữ`,
    remove: (group: string, name: string | null) => (name ? `Bỏ ô ${group}: ${name}` : `Bỏ ô ${group}`),
    rerollAll: 'Đổi cả mâm',
    add: '＋ Thêm món',
    addPick: 'Thêm món nhóm nào?',
    addCancel: 'Thôi',
    openDetail: (group: string, name: string, rarity: string) => `Xem công thức: ${group} ${name}, ${rarity}`,
    detailTitle: (name: string) => `Chi tiết món ${name}`,
    backToTray: '← Về mâm',
  },
  screens: {
    library: 'Sổ món của nhà',
    history: 'Mâm đã chốt',
  },
} as const
