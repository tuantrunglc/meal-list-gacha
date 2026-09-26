import { fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Modal } from './Modal'

function Harness({ locked = false, focusTitle = false }: { locked?: boolean; focusTitle?: boolean }) {
  const [open, setOpen] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)
  return (
    <>
      <button onClick={() => setOpen(true)}>Mở</button>
      {open && (
        <Modal label="Hộp" onClose={() => setOpen(false)} locked={locked} initialFocusRef={focusTitle ? title : undefined}>
          <h2 tabIndex={-1} ref={title}>
            Tiêu đề
          </h2>
          <button>Một</button>
          <button onClick={() => setOpen(false)}>Hai</button>
        </Modal>
      )}
    </>
  )
}

describe('Modal', () => {
  it('focus vào dialog, giữ Tab bên trong, Esc đóng và trả focus', () => {
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Mở' })
    opener.focus()
    fireEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Hộp' })
    expect(document.activeElement).toBe(dialog)
    const last = screen.getByRole('button', { name: 'Hai' })
    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Một' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('Shift+Tab từ dialog/nút đầu vòng về nút cuối', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Mở' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Hai' }))
    screen.getByRole('button', { name: 'Một' }).focus()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Một' }), { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Hai' }))
  })

  it('chạm nền thì đóng; locked thì Esc và chạm nền đều không đóng', () => {
    const { unmount } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Mở' }))
    fireEvent.click(document.querySelector('.modal__dim')!)
    expect(screen.queryByRole('dialog')).toBeNull()
    unmount()
    render(<Harness locked />)
    fireEvent.click(screen.getByRole('button', { name: 'Mở' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(document.querySelector('.modal__dim')!)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('initialFocusRef: focus vào tiêu đề khi mở', () => {
    render(<Harness focusTitle />)
    fireEvent.click(screen.getByRole('button', { name: 'Mở' }))
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Tiêu đề' }))
  })
})
