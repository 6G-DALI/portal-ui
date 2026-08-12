import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import AccountPage from './pages/AccountPage'
import type { View } from './types'

const VIEWS: View[] = ['overview', 'account']

function parseHash(): View {
  const hash = window.location.hash.replace(/^#\/?/, '').split('/')[0]
  return (VIEWS as string[]).includes(hash) ? (hash as View) : 'overview'
}

/**
 * Hash routing, the same approach dataops-ui uses, so both apps behave
 * identically in the address bar. Two views is not worth React Router; when the
 * portal grows, both apps should migrate together (guidelines §9).
 */
export default function App() {
  const [view, setView] = useState<View>(parseHash)

  useEffect(() => {
    const onHashChange = () => setView(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function navigate(next: View) {
    window.location.hash = `#/${next}`
  }

  return (
    <>
      {/* §22: skip-to-content must be the first focusable element. */}
      <a className="skip-to-content" href="#main">Skip to content</a>
      <Layout view={view} onNavigate={navigate}>
        {view === 'account' ? <AccountPage /> : <DashboardPage />}
      </Layout>
    </>
  )
}
