import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from '@/shared/lib/i18n'

interface Props { children: ReactNode }
interface State { failed: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }
  static getDerivedStateFromError(): State { return { failed: true } }
  componentDidCatch(_error: Error, _info: ErrorInfo) {}
  render() { return this.state.failed ? <ErrorScreen/> : this.props.children }
}

function ErrorScreen() {
  const { t } = useTranslation()
  return <main className="error-screen"><span>◌</span><h1>{t('errorTitle')}</h1><p>{t('errorHint')}</p><button onClick={() => window.location.reload()}>{t('reload')}</button></main>
}
