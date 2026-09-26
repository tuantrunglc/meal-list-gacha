// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Chạy oxlint với đúng .oxlintrc.json của dự án trên một cây src/ giả trong thư mục tạm.
const webRoot = resolve(import.meta.dirname, '..')
const oxlintBin = join(webRoot, 'node_modules', '.bin', 'oxlint')
let sandbox = ''

beforeAll(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'lint-rules-'))
  copyFileSync(join(webRoot, '.oxlintrc.json'), join(sandbox, '.oxlintrc.json'))
})

afterAll(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
})

function lint(file: string, source: string) {
  const path = join(sandbox, file)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, source)
  const result = spawnSync(oxlintBin, ['-c', '.oxlintrc.json', file], { cwd: sandbox, encoding: 'utf8' })
  rmSync(path)
  // oxlint phải thực sự chạy, nếu không các ca "bị chặn" sẽ pass giả
  expect(result.error).toBeUndefined()
  return result
}

function expectBlocked(file: string, source: string) {
  const r = lint(file, source)
  expect(r.status).toBe(1)
  expect(r.stdout).toContain('no-restricted-imports')
}

function expectAllowed(file: string, source: string) {
  const r = lint(file, source)
  expect(r.status, r.stdout).toBe(0)
}

describe('rule chặn import sai lớp', () => {
  it('chặn pocketbase ngoài src/data/, kể cả subpath', () => {
    expectBlocked('src/features/x.ts', "import PocketBase from 'pocketbase'\nexport const a = PocketBase\n")
    expectBlocked('src/features/y.ts', "import PocketBase from 'pocketbase/cjs'\nexport const a = PocketBase\n")
  })

  it('cho phép pocketbase trong src/data/', () => {
    expectAllowed('src/data/pb.ts', "import PocketBase from 'pocketbase'\nexport const a = PocketBase\n")
  })

  it('chặn engine import lớp khác, mọi cách viết đường dẫn', () => {
    expectBlocked('src/engine/a.ts', "import { copy } from '../ui/copy'\nexport const a = copy\n")
    expectBlocked('src/engine/b.ts', "import { copy } from './../ui/copy'\nexport const a = copy\n")
    expectBlocked('src/engine/sub/c.ts', "import { pb } from '../../data/pb'\nexport const a = pb\n")
    expectBlocked('src/engine/d.ts', "import { copy } from '@/ui/copy'\nexport const a = copy\n")
    expectBlocked('src/engine/e.ts', "import PocketBase from 'pocketbase'\nexport const a = PocketBase\n")
  })

  it('cho phép engine import file của chính engine', () => {
    expectAllowed('src/engine/z.ts', "import { w } from './w'\nexport const a = w\n")
    expectAllowed('src/engine/sub/z.ts', "import { w } from '../w'\nexport const a = w\n")
  })
})

describe('đồ thị phụ thuộc giữa các lớp', () => {
  it('data/ không import sets, features, ui, app; vẫn import được engine và pocketbase', () => {
    expectBlocked('src/data/a.ts', "import { getSet } from '../sets/registry'\nexport const a = getSet\n")
    expectBlocked('src/data/b.ts', "import { copy } from '../ui/copy'\nexport const a = copy\n")
    expectAllowed('src/data/c.ts', "import { drawSlots } from '../engine'\nimport PocketBase from 'pocketbase'\nexport const a = [drawSlots, PocketBase]\n")
  })

  it('sets/ không import data, features; vẫn import được engine và ui', () => {
    expectBlocked('src/sets/a.ts', "import { pb } from '../data/pb'\nexport const a = pb\n")
    expectBlocked('src/sets/food/b.ts', "import { X } from '../../features/spin/X'\nexport const a = X\n")
    expectAllowed('src/sets/food/c.ts', "import { drawSlots } from '../../engine'\nimport { copy } from '../../ui/copy'\nexport const a = [drawSlots, copy]\n")
  })

  it('ui/ không import lớp nào khác', () => {
    expectBlocked('src/ui/a.ts', "import { getSet } from '../sets/registry'\nexport const a = getSet\n")
    expectBlocked('src/ui/b.ts', "import { pb } from '../data/pb'\nexport const a = pb\n")
    expectAllowed('src/ui/c.ts', "import { x } from './x'\nexport const a = x\n")
  })
})
