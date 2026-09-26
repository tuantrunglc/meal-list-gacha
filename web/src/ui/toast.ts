import { create } from 'zustand'

type ToastState = {
  message: string | null
  /** Tăng mỗi lần hiện để cùng một câu vẫn được đọc lại. */
  id: number
  show: (message: string) => void
  hide: () => void
}

export const useToast = create<ToastState>((set, get) => ({
  message: null,
  id: 0,
  show: (message) => set({ message, id: get().id + 1 }),
  hide: () => set({ message: null }),
}))

export function showToast(message: string) {
  useToast.getState().show(message)
}
