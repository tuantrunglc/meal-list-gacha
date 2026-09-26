import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RouteErrorBoundary } from './RouteErrorBoundary'

afterEach(() => vi.restoreAllMocks())

function Boom(): never {
  throw new Error('chunk load failed')
}

describe('RouteErrorBoundary', () => {
  it('con lỗi (vd. không tải được chunk): báo lỗi thân thiện + Thử lại tải lại trang, không làm sập app', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const reload = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload })
    render(
      <div>
        <p>vẫn còn</p>
        <RouteErrorBoundary>
          <Boom />
        </RouteErrorBoundary>
      </div>,
    )
    expect(screen.getByText('vẫn còn')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Không mở được màn này')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(reload).toHaveBeenCalled()
  })

  it('không lỗi thì hiện con bình thường', () => {
    render(
      <RouteErrorBoundary>
        <p>màn cài đặt</p>
      </RouteErrorBoundary>,
    )
    expect(screen.getByText('màn cài đặt')).toBeInTheDocument()
  })
})
