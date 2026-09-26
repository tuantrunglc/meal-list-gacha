import { Navigate, Outlet, Route, Routes } from 'react-router'
import { HistoryScreen } from '../features/history/HistoryScreen'
import { LibraryScreen } from '../features/library/LibraryScreen'
import { SpinScreen } from '../features/spin/SpinScreen'
import { TabBar } from './TabBar'

function Shell() {
  return (
    <>
      <main className="app-main">
        <Outlet />
      </main>
      <TabBar />
    </>
  )
}

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<SpinScreen />} />
        <Route path="mon-an" element={<LibraryScreen />} />
        <Route path="lich-su" element={<HistoryScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
