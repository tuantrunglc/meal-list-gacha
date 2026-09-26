import { Component, type ReactNode } from 'react'
import { copy } from '../ui/copy'

type State = { failed: boolean }

/**
 * Màn tải lười bị lỗi (mất mạng, bản cũ sau khi deploy xoá chunk): chỉ màn đó báo lỗi + tải lại,
 * không làm sập cả app.
 */
export class RouteErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="route-error">
        <p className="form-error">{copy.routeError}</p>
        <button type="button" className="button-secondary" onClick={() => window.location.reload()}>
          {copy.retry}
        </button>
      </div>
    )
  }
}
