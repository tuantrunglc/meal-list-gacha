import { useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { refreshSession, useAuth } from '../data/auth'
import { LoginScreen } from '../features/auth/LoginScreen'

/** Chưa đăng nhập thì mọi route là màn đăng nhập. Đã đăng nhập thì giữ token luôn tươi. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const wasAuthenticated = useRef(isAuthenticated)

  useEffect(() => {
    // Vừa đăng nhập xong thì vào màn Quay
    if (isAuthenticated && !wasAuthenticated.current) navigate('/', { replace: true })
    wasAuthenticated.current = isAuthenticated
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (!isAuthenticated) return
    // Mở app: làm mới luôn để biết tài khoản còn hợp lệ
    void refreshSession(true)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshSession()
    }
    document.addEventListener('visibilitychange', onVisible)
    // Tab mở liên tục nhiều ngày thì visibilitychange không bắn: kiểm tra mỗi giờ
    const timer = window.setInterval(() => void refreshSession(), 3_600_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
    }
  }, [isAuthenticated])

  if (!isAuthenticated) return <LoginScreen />
  return <>{children}</>
}
