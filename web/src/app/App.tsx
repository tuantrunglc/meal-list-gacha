import { domAnimation, LazyMotion, MotionConfig } from 'motion/react'
import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router'
import { HistoryScreen } from '../features/history/HistoryScreen'
import { LibraryScreen } from '../features/library/LibraryScreen'
import { SpinScreen } from '../features/spin/SpinScreen'
import { AuthGate } from './AuthGate'
import { Toaster } from '../ui/Toaster'
import { TabBar } from './TabBar'

// Cài đặt ít khi mở: tải riêng để bundle chính nhỏ hơn
const SettingsScreen = lazy(() =>
  import('../features/settings/SettingsScreen').then((m) => ({ default: m.SettingsScreen })),
)

function Shell() {
  return (
    <AuthGate>
      <main className="app-main">
        <Outlet />
      </main>
      <TabBar />
      <Toaster />
    </AuthGate>
  )
}

export function App() {
  return (
    // Lưới an toàn: animation của `motion` tôn trọng Giảm chuyển động của hệ thống.
    // LazyMotion + `m`: chỉ nạp phần animation cần dùng (bundle nhỏ hơn `motion.*`).
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<SpinScreen />} />
            <Route path="mon-an" element={<LibraryScreen />} />
            <Route path="lich-su" element={<HistoryScreen />} />
            <Route
              path="cai-dat"
              element={
                <Suspense fallback={null}>
                  <SettingsScreen />
                </Suspense>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </MotionConfig>
    </LazyMotion>
  )
}
