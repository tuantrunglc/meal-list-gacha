import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../data/errors'
import { LoginScreen } from './LoginScreen'

const mutate = vi.fn()
const reset = vi.fn()
const loginState: { isPending: boolean; error: AppError | null } = { isPending: false, error: null }

vi.mock('../../data/auth', () => ({
  useLogin: () => ({ mutate, reset, ...loginState }),
}))

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginScreen />
    </MemoryRouter>,
  )
}

describe('LoginScreen', () => {
  beforeEach(() => {
    mutate.mockReset()
    loginState.isPending = false
    loginState.error = null
  })

  it('có nhãn cho email/mật khẩu, nút khoá khi chưa nhập đủ', async () => {
    renderLogin()
    const button = screen.getByRole('button', { name: 'Vào bếp thôi!' })
    expect(button).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.vn')
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'matkhau')
    expect(button).toBeEnabled()
    await userEvent.click(button)
    expect(mutate).toHaveBeenCalledWith({ email: 'a@b.vn', password: 'matkhau' })
  })

  it('lỗi hiện role=alert với lời nhắn thân thiện', () => {
    loginState.error = new AppError('invalid-credentials')
    renderLogin()
    expect(screen.getByRole('alert')).toHaveTextContent('Sai email hoặc mật khẩu rồi, thử lại nhé.')
  })

  it('gõ lại thì bỏ lỗi cũ', async () => {
    loginState.error = new AppError('invalid-credentials')
    renderLogin()
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'x')
    expect(reset).toHaveBeenCalled()
  })

  it('email toàn khoảng trắng thì chưa bật nút', async () => {
    renderLogin()
    await userEvent.type(screen.getByLabelText('Email'), '   ')
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'matkhau')
    expect(screen.getByRole('button', { name: 'Vào bếp thôi!' })).toBeDisabled()
  })

  it('đang gửi thì khoá nút và đổi chữ', () => {
    loginState.isPending = true
    renderLogin()
    expect(screen.getByRole('button', { name: 'Đang mở cửa bếp…' })).toBeDisabled()
  })
})
