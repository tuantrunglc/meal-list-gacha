import PocketBase from 'pocketbase'

// Cùng domain với website: dev qua proxy của Vite, prod do PocketBase phục vụ cả web lẫn API.
// Phiên đăng nhập được SDK lưu trong localStorage nên mở lại app vẫn còn.
export const pb = new PocketBase('/')

// Không tự huỷ request trùng: TanStack Query đã lo việc gom/huỷ.
pb.autoCancellation(false)
