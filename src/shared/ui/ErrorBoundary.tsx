import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { failed: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }
  static getDerivedStateFromError(): State { return { failed: true } }
  componentDidCatch(_error: Error, _info: ErrorInfo) {}
  render() {
    if (this.state.failed) {
      return <main className="error-screen"><span>◌</span><h1>Что-то пошло не так</h1><p>Попробуйте перезапустить приложение.</p><button onClick={() => window.location.reload()}>Перезагрузить</button></main>
    }
    return this.props.children
  }
}
