import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../data/errors'
import type { ItemsResult } from '../../data/items'
import { SpinScreen } from './SpinScreen'

const refetch = vi.fn(async () => {})
let state: ItemsResult

vi.mock('../../data/items', () => ({ useItems: () => state }))

describe('SpinScreen', () => {
  beforeEach(() => {
    refetch.mockClear()
    state = { data: [], error: null, isPending: false, isError: false, refetch }
  })

  it('lỗi thì hiện lời nhắn thân thiện và nút Thử lại', async () => {
    state = { ...state, data: undefined, error: new AppError('network'), isError: true }
    render(<SpinScreen />)
    expect(screen.getByRole('alert')).toHaveTextContent('Mất mạng rồi, kiểm tra wifi rồi thử lại nhé.')
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('không lỗi thì không có alert', () => {
    render(<SpinScreen />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
