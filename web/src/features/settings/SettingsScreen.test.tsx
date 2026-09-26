import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../data/errors'
import { useToast } from '../../ui/toast'
import { SettingsScreen } from './SettingsScreen'

type SaveOpts = { onSuccess?: () => void }
const mutate = vi.fn<(days: number, opts?: SaveOpts) => void>()
const refetch = vi.fn()
let config: { data?: { cooldownDays: number | null }; error: AppError | null }
let save: { isPending: boolean; error: AppError | null; ready: boolean }

const householdRefetch = vi.fn()
let householdError: AppError | null = null
vi.mock('../../data/household', () => ({
  useCurrentHousehold: () => ({ data: householdError ? undefined : { id: 'h1' }, error: householdError, refetch: householdRefetch }),
}))

const restoreMutate = vi.fn()
const restoreReset = vi.fn()
let restoreState: { isPending: boolean; error: AppError | null; ready: boolean }
let onRestored: (() => void) | undefined
vi.mock('../../data/items', () => ({
  useRestoreSeed: (_set: unknown, cb?: () => void) => {
    onRestored = cb
    return { mutate: restoreMutate, reset: restoreReset, ...restoreState }
  },
}))

const snd = vi.hoisted(() => ({ unlock: vi.fn(), preload: vi.fn(), play: vi.fn() }))
vi.mock('../../ui/sound', () => ({ unlockAudio: snd.unlock, preloadSounds: snd.preload, playRaritySound: snd.play }))

vi.mock('../../data/setConfig', () => ({
  useSetConfig: () => ({ ...config, refetch }),
  useSaveCooldown: () => ({ mutate, reset: vi.fn(), ...save }),
}))

beforeEach(() => {
  config = { data: { cooldownDays: null }, error: null }
  save = { isPending: false, error: null, ready: true }
  mutate.mockReset()
  householdError = null
  restoreState = { isPending: false, error: null, ready: true }
  restoreMutate.mockReset()
  restoreReset.mockReset()
})
afterEach(() => window.localStorage.clear())

const renderScreen = () => render(<SettingsScreen />, { wrapper: MemoryRouter })
const inc = () => screen.getByRole('button', { name: 'Thêm một ngày' })
const dec = () => screen.getByRole('button', { name: 'Bớt một ngày' })
const saveBtn = () => screen.getByRole('button', { name: 'Lưu' })

describe('SettingsScreen', () => {
  it('chưa cấu hình: hiện số ngày mặc định của Bộ (3), Lưu khoá khi chưa đổi', () => {
    renderScreen()
    expect(screen.getByRole('heading', { level: 1, name: 'Cài đặt' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Về màn Quay' })).toHaveAttribute('href', '/')
    expect(screen.getByText('3 ngày')).toBeInTheDocument()
    expect(screen.getByText('Món đã chốt sẽ nghỉ 3 ngày rồi mới ra lại.')).toBeInTheDocument()
    expect(saveBtn()).toBeDisabled()
  })

  it('đổi rồi lưu: gửi số mới, xong báo "Đã lưu." và Lưu khoá lại', () => {
    mutate.mockImplementation((_d, opts) => {
      config = { data: { cooldownDays: 5 }, error: null }
      opts?.onSuccess?.()
    })
    renderScreen()
    fireEvent.click(inc())
    fireEvent.click(inc())
    expect(screen.getByText('5 ngày')).toBeInTheDocument()
    expect(saveBtn()).toBeEnabled()
    fireEvent.click(saveBtn())
    expect(mutate).toHaveBeenCalledWith(5, expect.anything())
    expect(useToast.getState().message).toBe('Đã lưu.')
    expect(saveBtn()).toBeDisabled()
  })

  it('đổi rồi đổi lại về giá trị cũ thì Lưu khoá', () => {
    renderScreen()
    fireEvent.click(inc())
    fireEvent.click(dec())
    expect(saveBtn()).toBeDisabled()
  })

  it('giới hạn 0..30; 0 thì nói không tránh trùng', () => {
    config = { data: { cooldownDays: 0 }, error: null }
    renderScreen()
    expect(dec()).toBeDisabled()
    expect(screen.getByText(/Không tránh trùng/)).toBeInTheDocument()
  })

  it('tối đa 30 thì + khoá', () => {
    config = { data: { cooldownDays: 30 }, error: null }
    renderScreen()
    expect(inc()).toBeDisabled()
    expect(dec()).toBeEnabled()
  })

  it('lỗi lưu: hiện lời nhắn, nút thành Thử lại, giữ số đang chỉnh', () => {
    renderScreen()
    fireEvent.click(inc())
    save = { ...save, error: new AppError('network') }
    fireEvent.click(dec())
    fireEvent.click(inc())
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('4 ngày')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(mutate).toHaveBeenCalledWith(4, expect.anything())
  })

  it('tải cấu hình lỗi: báo và Thử lại', () => {
    config = { data: undefined, error: new AppError('network') }
    renderScreen()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(refetch).toHaveBeenCalled()
  })

  it('đang tải cấu hình: báo đang tải, chưa hiện stepper', () => {
    config = { data: undefined, error: null }
    renderScreen()
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải cài đặt…')
    expect(screen.queryByRole('button', { name: 'Thêm một ngày' })).toBeNull()
  })

  it('chưa có household (lỗi): báo lỗi và Thử lại tải household', () => {
    config = { data: undefined, error: null }
    householdError = new AppError('no-household')
    renderScreen()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(householdRefetch).toHaveBeenCalled()
  })

  it('tải lại nền lỗi khi đã có dữ liệu: vẫn giữ stepper và số đang chỉnh', () => {
    const { rerender } = renderScreen()
    fireEvent.click(inc())
    config = { data: { cooldownDays: null }, error: new AppError('network') }
    rerender(<SettingsScreen />)
    expect(screen.getByText('4 ngày')).toBeInTheDocument()
    expect(saveBtn()).toBeEnabled()
  })

  it('household chưa sẵn sàng thì chưa lưu được', () => {
    save = { ...save, ready: false }
    renderScreen()
    fireEvent.click(inc())
    expect(saveBtn()).toBeDisabled()
  })

  it('đang lưu thì khoá cả − + Lưu', () => {
    renderScreen()
    fireEvent.click(inc())
    save = { ...save, isPending: true }
    act(() => {
      fireEvent.click(dec())
    })
    // re-render do click; pending làm khoá
    expect(inc()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Đang lưu…' })).toBeDisabled()
  })

  it('công tắc âm thanh: mặc định tắt, bật thì lưu ngay trên máy', () => {
    renderScreen()
    const sw = screen.getByRole('switch', { name: 'Âm thanh khi mở nồi' })
    expect(sw).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'true')
    expect(window.localStorage.getItem('noi-than:sound')).toBe('on')
    // bật: mở khoá audio trong lần chạm, tải sẵn, phát thử "ting"
    expect(snd.unlock).toHaveBeenCalledTimes(1)
    expect(snd.preload).toHaveBeenCalledTimes(1)
    // phát thử: không bỏ dù lần đầu tải chậm
    expect(snd.play).toHaveBeenCalledWith(2, { late: true })
    // iOS: mở khoá trước khi phát
    expect(snd.unlock.mock.invocationCallOrder[0]).toBeLessThan(snd.play.mock.invocationCallOrder[0])
    // tắt: im lặng
    fireEvent.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'false')
    expect(snd.play).toHaveBeenCalledTimes(1)
  })

  describe('khôi phục món mặc định', () => {
    const open = () => fireEvent.click(screen.getByRole('button', { name: 'Khôi phục món mặc định' }))

    it('hỏi xác nhận; Thôi thì không gọi server', () => {
      renderScreen()
      open()
      const dialog = screen.getByRole('alertdialog', { name: 'Khôi phục món mặc định?' })
      expect(dialog).toHaveTextContent('món nhà tự thêm vẫn giữ nguyên.')
      fireEvent.click(screen.getByRole('button', { name: 'Thôi' }))
      expect(screen.queryByRole('alertdialog')).toBeNull()
      expect(restoreMutate).not.toHaveBeenCalled()
      // lỗi cũ không còn khi mở lại
      expect(restoreReset).toHaveBeenCalled()
    })

    it('household chưa sẵn sàng thì chưa xác nhận được', () => {
      restoreState = { ...restoreState, ready: false }
      renderScreen()
      open()
      expect(screen.getByRole('button', { name: 'Khôi phục' })).toBeDisabled()
    })

    it('xác nhận thì khôi phục; xong đóng hộp và báo', () => {
      const { rerender } = renderScreen()
      open()
      fireEvent.click(screen.getByRole('button', { name: 'Khôi phục' }))
      expect(restoreMutate).toHaveBeenCalledTimes(1)
      act(() => onRestored?.())
      rerender(<SettingsScreen />)
      expect(screen.queryByRole('alertdialog')).toBeNull()
      expect(useToast.getState().message).toBe('Nồi đủ món gốc rồi nè!')
    })

    it('đang chạy thì khoá; lỗi thì hiện lời nhắn và Thử lại', () => {
      const { rerender } = renderScreen()
      open()
      restoreState = { ...restoreState, isPending: true }
      rerender(<SettingsScreen />)
      expect(screen.getByRole('button', { name: 'Đang khôi phục…' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Thôi' })).toBeDisabled()
      restoreState = { ...restoreState, isPending: false, error: new AppError('network') }
      rerender(<SettingsScreen />)
      expect(within(screen.getByRole('alertdialog')).getByRole('alert')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
      expect(restoreMutate).toHaveBeenCalledTimes(1)
    })
  })
})
