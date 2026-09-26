import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

// Ảnh protected cần file token (useQuery): unit test của component không cần server,
// nên thay bằng bản không token. Test riêng của data/files dùng vi.unmock.
vi.mock('../data/files', async () => {
  const { itemImageSources } = await vi.importActual<typeof import('../data/items')>('../data/items')
  return {
    useFileToken: () => ({ data: 'test-token' }),
    useItemImages: () => (item: Parameters<typeof itemImageSources>[0], size: 'thumb' | 'full' = 'thumb') =>
      itemImageSources(item, 'test-token', size),
  }
})
