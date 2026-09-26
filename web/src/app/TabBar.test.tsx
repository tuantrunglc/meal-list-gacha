import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'

vi.mock('../data/household', () => ({
  useCurrentHousehold: () => ({ data: { id: 'h' }, error: null, refetch: vi.fn() }),
}))

vi.mock('../data/draws', () => ({
  useRecentDraws: () => ({ data: [], isPending: false, fetchStatus: 'idle' }),
  useHasDraws: () => ({ data: false }),
  useDrawHistory: () => ({ data: { pages: [{ items: [], page: 1, totalPages: 1 }] }, hasNextPage: false }),
  useCommitTray: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
}))

vi.mock('../data/items', () => ({
  useItems: () => ({ isError: false, data: [], all: [] }),
}))

vi.mock('../data/auth', () => ({
  useAuth: () => ({ isAuthenticated: true, userId: 'u1' }),
  refreshSession: vi.fn(async () => {}),
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('TabBar', () => {
  it('có 3 tab Quay · Món ăn · Lịch sử, tab Quay active ở gốc', () => {
    renderAt('/')
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' })
    const links = nav.querySelectorAll('a')
    expect([...links].map((a) => a.textContent)).toEqual(['Quay', 'Món ăn', 'Lịch sử'])
    expect(screen.getByRole('link', { name: 'Quay' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Món ăn' })).not.toHaveAttribute('aria-current')
  })

  it('chạm tab thì đổi màn và tab active', async () => {
    renderAt('/')
    await userEvent.click(screen.getByRole('link', { name: 'Món ăn' }))
    expect(screen.getByRole('heading', { name: 'Sổ món của nhà' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Món ăn' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Quay' })).not.toHaveAttribute('aria-current')

    await userEvent.click(screen.getByRole('link', { name: 'Lịch sử' }))
    expect(screen.getByRole('heading', { name: 'Mâm đã chốt' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Lịch sử' })).toHaveAttribute('aria-current', 'page')
  })

  it('mở thẳng /lich-su thì chỉ tab Lịch sử active', () => {
    renderAt('/lich-su')
    expect(screen.getByRole('link', { name: 'Lịch sử' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Quay' })).not.toHaveAttribute('aria-current')
  })

  it('URL lạ thì về màn Quay', () => {
    renderAt('/abc')
    expect(screen.getByRole('heading', { name: 'Nay ăn gì cả nhà?' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Quay' })).toHaveAttribute('aria-current', 'page')
  })
})
