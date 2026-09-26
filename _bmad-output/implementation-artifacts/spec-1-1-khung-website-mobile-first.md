---
title: 'Story 1.1: Khung website mobile-first'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: 'NO_VCS'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-app-eat-lucky-2026-09-26/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Repo trống, chưa có khung nào để các tính năng Nồi Thần gắn vào.

**Approach:** Dựng `web/` bằng `create-vite` react-ts với đúng stack ghim trong spine, tạo cấu trúc thư mục theo lớp, lint chặn phụ thuộc sai chiều, token DESIGN.md thành CSS variables, app shell có thanh tab 3 tab (màn trống tạm), và vitest chạy được.

## Boundaries & Constraints

**Always:**
- Phiên bản ghim chính xác (không `^`/`~`): vite 8.3.1, react/react-dom 19.3.0, typescript 7.0.2, react-router 8.4.0, @tanstack/react-query 5.104.0, zustand 5.0.15, motion 13.4.4, pocketbase 0.28.1, vitest 5.0.2, @playwright/test 1.63.0.
- Lint là **oxlint** (template `create-vite` hiện tại đã bỏ ESLint; `typescript-eslint` không hỗ trợ TS 7). Rule `no-restricted-imports` giống hệt cú pháp ESLint: chặn `pocketbase` ngoài `src/data/**`; trong `src/engine/**` chặn mọi import tương đối ra ngoài `engine/` và `pocketbase`.
- Mọi màu/typography/rounded/spacing lấy từ biến CSS; component không viết cứng mã màu. Chỉ một biến bóng `--shadow-soft`.
- Chuỗi hiển thị nằm trong `src/ui/copy.ts`. `<html lang="vi">`.
- Font self-host qua `@fontsource` (subset vietnamese + latin), không gọi Google Fonts.

**Never:**
- Không manifest, không service worker, không PWA plugin.
- Không làm nội dung thật của các màn (nồi, chip mùa, thư viện…) — chỉ màn trống có tiêu đề.
- Không cài UI kit/icon library; icon tab là SVG inline.
- Không dựng PocketBase/migration/Dockerfile (Story 1.3, 1.9) — chỉ tạo thư mục.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mở gốc | `/` | Màn Quay, tab Quay `aria-current="page"` màu `primary` | N/A |
| Đổi tab | chạm "Món ăn" / "Lịch sử" | tới `/mon-an` / `/lich-su`, tab tương ứng active | N/A |
| URL lạ | `/abc` | chuyển về `/` | N/A |
| Import sai lớp | `pocketbase` trong `src/features/x.ts`, hoặc `../ui` trong `src/engine/` | `npm run lint` exit ≠ 0 | N/A |

</frozen-after-approval>

## Code Map

- Repo chưa có code. Cấu hình gốc lấy từ output `npm create vite@9.2.1 web -- --template react-ts --no-interactive` (tsconfig.app/node, vite.config.ts, `.oxlintrc.json`, `tsc -b && vite build`); đã thử: `tsc -b` chạy được với TS 7.0.2, oxlint `overrides` theo `files` hoạt động.
- Lưu ý oxlint: override cho `src/engine/**` **thay** options của rule, nên phải liệt kê lại cả `pocketbase`.
- Bỏ file demo của template: `src/App.css`, `src/assets/*`, `public/icons.svg`, nội dung `App.tsx`.

## Tasks & Acceptance

**Execution:**
- [x] `web/` -- chạy create-vite như trên; ghim phiên bản; thêm deps `react-router`, `@tanstack/react-query`, `zustand`, `motion`, `pocketbase`, `@fontsource/baloo-2`, `@fontsource/be-vietnam-pro`; devDeps `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@playwright/test` (không tải browser); scripts `test: vitest run`, `typecheck: tsc -b` -- khung dự án.
- [x] `web/src/{features,sets,engine,data}/.gitkeep`, `server/pb_migrations/.gitkeep`, `server/pb_hooks/.gitkeep`, `deploy/.gitkeep` -- cấu trúc theo spine.
- [x] `web/.oxlintrc.json` -- rule chặn import như Boundaries -- AD-5 và chiều phụ thuộc engine.
- [x] `web/vite.config.ts` -- plugin react, proxy `/api` → `http://127.0.0.1:8090`, cấu hình `test` (jsdom, setup file) -- dev env + vitest.
- [x] `web/src/ui/tokens.css` -- toàn bộ token DESIGN.md dạng `--color-*`, `--font-*`/`--text-*`, `--radius-*`, `--space-*`, `--shadow-soft` -- UX-DR1.
- [x] `web/src/ui/global.css` -- reset nhẹ, `body` nền `surface-base`, chữ `ink-primary`, font body; khung một cột max-width ~480px, lề `--space-margin-mobile`; chừa đáy cho tab bar + `env(safe-area-inset-bottom)` -- NFR1.
- [x] `web/src/ui/copy.ts` -- nhãn tab và tiêu đề màn tạm.
- [x] `web/src/app/TabBar.tsx` -- `<nav aria-label>` cố định đáy, 3 `NavLink` (icon SVG `aria-hidden` + chữ `label`), mỗi tab ≥ 48px, active màu `primary`, inactive `ink-secondary`, nền `surface-raised` -- UX-DR2.
- [x] `web/src/app/App.tsx` + `web/src/main.tsx` -- `BrowserRouter`, routes `/`, `/mon-an`, `/lich-su`, `*`→`/`; `QueryClientProvider` (không persist); import fonts + CSS.
- [x] `web/src/features/{spin,library,history}/*Screen.tsx` -- màn trống có tiêu đề `title`.
- [x] `web/index.html` + `web/public/favicon.svg` -- `lang="vi"`, `<title>Nồi Thần</title>`, `<meta name="theme-color" content="#FBF6EC">`, viewport `viewport-fit=cover`, favicon SVG nồi đất đơn giản.
- [x] `web/src/app/TabBar.test.tsx` -- test mẫu: render trong `MemoryRouter`, có 3 link đúng nhãn, tab của route hiện tại có `aria-current="page"`.

**Acceptance Criteria:**
- Given `web/`, when `npm run lint && npm run typecheck && npm test && npm run build`, then tất cả thành công và `dist/` không có `manifest*` hay service worker.
- Given `vite dev` mở ở viewport 390px, when xem, then nền kem, chữ tiếng Việt có dấu hiển thị bằng Baloo 2/Be Vietnam Pro, một cột lề 16px, tab bar đáy đúng màu.

## Implementation Notes

- Làm trực tiếp trong phiên chính (không dispatch subagent). Không có VCS nên `baseline_commit: NO_VCS`; "diff" là toàn bộ `web/`, `server/`, `deploy/` mới tạo.
- Font: import theo subset `latin-*` + `vietnamese-*` của `@fontsource` (Baloo 2: 700/800; Be Vietnam Pro: 400/500/600). Import gốc `700.css` kéo cả subset devanagari vào `dist/` nên đã bỏ.
- Cỡ chữ token dùng `rem` (tương đương px của DESIGN.md) để theo cỡ chữ động.
- Thêm `@testing-library/dom`, `@testing-library/user-event` (peer/cần cho test), `@types/node` ghim 24.13.3 theo template.
- Test ma trận: `src/app/TabBar.test.tsx` (hàng 1–3), `tests/lint-rules.test.ts` chạy oxlint thật với `.oxlintrc.json` trên cây src giả (hàng 4). `tests/` được thêm vào `tsconfig.node.json`.
- Kiểm tra `dist/`: grep "manifest|serviceWorker" có khớp nhưng là code nội bộ react-router (route manifest, switch tên worker) — không có `<link rel="manifest">` hay `serviceWorker.register`.
- Đã chụp `vite preview` 390×844 bằng Chrome: nền `#FBF6EC`, Baloo 2/Be Vietnam Pro nạp, dấu tiếng Việt đúng, lề 16px, tab 64px, tab active `rgb(217,67,59)`, đổi tab sang `/mon-an` chạy.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng | Route |
|---|---|---|---|---|---|
| 1 | blind, edge, verif | `pocketbase/cjs` lọt rule AD-5/AD-2 | medium | Chạy oxlint: `pocketbase/cjs` trong `src/features` exit 0 | patch — thêm pattern `pocketbase/**` |
| 2 | edge | Engine import `./../ui/copy` lọt rule | medium | Chạy oxlint: exit 0 | patch — chặn theo tên lớp đích (`**/ui/**`…) |
| 3 | edge | Alias `@/ui/copy` nhiều cấp lọt rule | low | `@/*` không khớp nhiều segment | patch — `@/**` |
| 4 | blind, edge, verif | Engine thư mục con không import được file engine (`../w`) | medium | Chạy oxlint: `src/engine/sub` import `../w` bị chặn | patch — cùng fix #2 |
| 5 | blind, edge | Lint test "bị chặn" pass giả khi oxlint không chạy (status null) | medium | `expect(null).not.toBe(0)` pass | patch — assert `error` undefined, status 1, có tên rule |
| 6 | edge | Windows cần `oxlint.cmd` | false | Dự án chỉ dev trên macOS, deploy Docker Linux | reject |
| 7 | blind | Engine không chặn react/zustand/node | low | AD-2 chỉ cấm import trong dự án và I/O; không có lỗi hiện tại | reject |
| 8 | blind | `end` trên mọi NavLink, route con sau này mất active | low | react-router `end` khớp tuyệt đối | patch — chỉ `/` có `end`; thêm test mở thẳng `/lich-su` |
| 9 | blind | Thiếu `strict: true` | false | TS 7 bật strict mặc định: implicit any báo TS7006 | reject |
| 10 | blind | Vitest sẽ ăn nhầm spec Playwright | low | Vitest mặc định include `*.spec.ts` | patch — `test.include` (đi kèm #14) |
| 11 | blind | `.gitignore` thiếu `.env`, output test | low | Chưa có `.env`; output Playwright có thật sau #14 | patch một phần — thêm `test-results`, `playwright-report` |
| 12 | blind, edge | Deep link `/mon-an` 404 ở prod | false | PocketBase `serve` bật `--indexFallback` mặc định; deploy là Story 1.9 | reject |
| 13 | blind | Không ghim Node (`engines`) , lint không `--deny-warnings`, theme-color viết cứng, thiếu apple-touch-icon/description, reduced-motion toàn cục, mkdtemp ở top-level | low | Không gây lỗi hiện tại; reduced-motion thuộc Epic 4; theme-color do spec yêu cầu; mkdtemp đã chuyển vào `beforeAll` khi viết lại test | reject (mkdtemp: đã sửa kèm #5) |
| 14 | verif | `main.tsx` (entry thật) không có test nào chạy | medium | Chỉ có test render `App` trong `MemoryRouter` | patch — `playwright.config.ts` + `e2e/smoke.spec.ts` chạy bản build qua `vite preview` với Chrome cài sẵn |
| 15 | blind | Thiếu `color-scheme: light` | low | Máy dark mode có thể vẽ control tối | patch — 1 dòng trong `global.css` |
| 16 | edge | Tab bar cao hơn 64px khi phóng chữ, che nội dung | low | `min-height` px cố định, padding đáy dùng biến px | patch — `--tab-bar-height: 4rem`, `height` cố định, nhãn `nowrap` |
| 17 | edge | `inset-inline` trên Safari < 14.1 | false | Ngoài phạm vi trình duyệt hỗ trợ | reject |

## Verification

**Commands:**
- `cd web && npm run lint` -- expected: 0 lỗi; thêm tạm file vi phạm (pocketbase ngoài data, engine import `../ui`) thì báo lỗi, rồi xoá file.
- `cd web && npm run typecheck && npm test && npm run build` -- expected: pass, test mẫu xanh.
- `ls web/dist; grep -ri "manifest\|serviceWorker" web/dist` -- expected: không có kết quả.

**Manual checks:**
- Chụp màn `vite preview` ở viewport mobile (390×844): 3 tab, đổi tab hoạt động, font có dấu đúng.
