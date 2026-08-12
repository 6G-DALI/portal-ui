import React from 'react'
import ReactDOM from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'admin-lte/dist/css/adminlte.min.css'
import 'admin-lte/dist/js/adminlte.min.js'
import App from './App'
import LandingPage from './pages/LandingPage'
import keycloak, { redirectUri } from './auth/keycloak'
import './index.css'

/**
 * Boots the portal.
 *
 * Unlike dataops-ui, which uses `onLoad: 'login-required'` and therefore has no
 * anonymous state, the portal is the ecosystem's front door and must be
 * publicly reachable. So it uses `check-sso`:
 *
 *   - an existing realm session is picked up silently, and the app renders
 *     signed in — a user arriving from another DALI app never sees a login step;
 *   - no session means the public landing page, with an explicit sign-in action.
 *
 * The silent check runs in a hidden iframe against /silent-check-sso.html so it
 * cannot redirect away from the landing page. Where third-party cookies are
 * blocked the check fails; that is reported rather than swallowed, because
 * otherwise it looks like the portal forgot an existing session.
 */

const RETURN_KEY = 'portal_post_login_hash'

function renderFatal(message: string) {
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML =
      `<div style="max-width:520px;margin:15vh auto;font-family:system-ui,sans-serif;text-align:center;color:#e8edf5">
        <h2 style="color:#ff4d6a">Authentication error</h2>
        <p style="color:#7a90b0">${message}</p>
        <button onclick="location.reload()" style="padding:.4rem 1rem;cursor:pointer">Retry</button>
      </div>`
  }
}

function mount(node: React.ReactElement) {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>{node}</React.StrictMode>
  )
}

/** Sends the visitor to Keycloak, remembering where they were headed. */
function signIn() {
  if (window.location.hash) {
    sessionStorage.setItem(RETURN_KEY, window.location.hash)
  }
  keycloak.login({ redirectUri: redirectUri() })
}

async function bootstrap() {
  // keycloak-js needs crypto.subtle for PKCE S256, and browsers only expose the
  // Web Crypto API in a secure context: HTTPS, or http on localhost/127.0.0.1.
  // Served over plain http on any other host it throws "Web Crypto API is not
  // available", which does not hint at the cause — so check first and say so.
  if (!window.isSecureContext || !window.crypto?.subtle) {
    renderFatal(
      `This page is served over an insecure connection (${window.location.protocol}//${window.location.host}), `
      + 'so the browser withholds the Web Crypto API that sign-in requires. '
      + 'Open the portal over HTTPS \u2014 or on localhost for local development.'
    )
    return
  }

  // Preserve the requested route across the login round-trip: the OAuth
  // redirect returns to the clean base URL, so stash the hash first.
  if (window.location.hash && !/(?:^|&)(state|access_token|code)=/.test(window.location.hash.slice(1))) {
    sessionStorage.setItem(RETURN_KEY, window.location.hash)
  }

  let authenticated = false
  let notice: string | null = null

  try {
    authenticated = await keycloak.init({
      // Public landing page: discover a session, never force one.
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      pkceMethod: 'S256',
      responseMode: 'query',
      redirectUri: redirectUri(),
      enableLogging: import.meta.env.DEV,
    })
  } catch (err) {
    // A failed *silent* check is recoverable — fall back to the landing page and
    // say why. Only a misconfigured or unreachable IdP is fatal.
    const message = (err as Error)?.message || 'The identity provider could not be reached.'
    if (/iframe|cookie|timed? ?out/i.test(message)) {
      notice = 'Could not check for an existing session automatically — '
        + 'your browser may be blocking third-party cookies. Sign in to continue.'
    } else {
      renderFatal(message)
      return
    }
  }

  if (!authenticated) {
    mount(<LandingPage onSignIn={signIn} notice={notice} />)
    return
  }

  // Restore the originally requested route.
  const target = sessionStorage.getItem(RETURN_KEY)
  if (target) {
    sessionStorage.removeItem(RETURN_KEY)
    if (window.location.hash !== target) window.location.hash = target
  }

  // Best-effort silent renewal; fall back to a fresh login on failure.
  keycloak.onTokenExpired = () => {
    keycloak.updateToken(30).catch(() => keycloak.login({ redirectUri: redirectUri() }))
  }

  mount(<App />)
}

bootstrap()
