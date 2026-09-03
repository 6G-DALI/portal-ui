import React from 'react'
import ReactDOM from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'admin-lte/dist/css/adminlte.min.css'
import 'admin-lte/dist/js/adminlte.min.js'
// The shared 6G-DALI theme, after Bootstrap and AdminLTE because it is written
// to override them. index.css (the portal's own styles) comes last.
import '@6g-dali/ui-theme/fonts.css'
import '@6g-dali/ui-theme'
import { initTheme } from '@6g-dali/ui-theme/theme.js'
import App from './App'
import LandingPage from './pages/LandingPage'
import keycloak, {
  appRedirectUri,
  clearStoredTokens,
  loadStoredTokens,
  persistTokens,
} from './auth/keycloak'
import './index.css'

// Applies the stored/OS-preferred theme before anything renders — landing
// page included — so there is no flash of the wrong theme. AppShell's navbar
// carries the toggle that flips it afterward.
initTheme()

/**
 * Boots the portal.
 *
 * Two paths, split by whether a session exists rather than by an explicit
 * route the visitor picked:
 *
 *   - `/home` is the permanent, always-public landing page for a visitor with
 *     no session.
 *   - Everywhere else (in practice just `/`, since in-app navigation is
 *     hash-based) requires one — a signed-in visitor is sent straight into
 *     the app, an anonymous one is bounced to `/home`.
 *
 * Session discovery does NOT use Keycloak's `onLoad: 'check-sso'`. That
 * discovers an existing session via a hidden iframe against Keycloak, which
 * depends on third-party cookies — ad blockers, Incognito and ITP/ETP all
 * routinely break it, sometimes only after a real login (its periodic
 * recheck shares the same iframe and can clear an otherwise-valid token).
 * Instead, `enterApp` below saves the session's tokens to `sessionStorage`
 * (see auth/keycloak.ts); on a later load those are handed straight to
 * `keycloak.init()`, which validates/refreshes them with a plain fetch to the
 * token endpoint — no iframe, no cookie, nothing for a blocker to catch. No
 * stored session (or a failed refresh) goes to `/home` with no round trip to
 * Keycloak at all; a confirmed one enters the app with no confirmation click.
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
  // Whatever got them here already failed a stored-token restore (see
  // bootstrap) — do not let a stale refresh token from that attempt survive
  // into the fresh login this triggers.
  clearStoredTokens()
  if (window.location.hash) {
    sessionStorage.setItem(RETURN_KEY, window.location.hash)
  }
  keycloak.login({ redirectUri: appRedirectUri() })
}

/** Persists the session, restores the pre-login route, wires silent renewal,
 *  and mounts the app. */
function enterApp() {
  persistTokens()

  const target = sessionStorage.getItem(RETURN_KEY)
  if (target) {
    sessionStorage.removeItem(RETURN_KEY)
    if (window.location.hash !== target) window.location.hash = target
  }

  // Best-effort silent renewal; fall back to a fresh login on failure.
  keycloak.onTokenExpired = () => {
    keycloak.updateToken(30).then(persistTokens).catch(() => {
      clearStoredTokens()
      keycloak.login({ redirectUri: appRedirectUri() })
    })
  }

  mount(<App />)
}

async function bootstrap() {
  // keycloak-js throws "Web Crypto API is not available" from three places:
  // createUUID (crypto.randomUUID, for state/nonce), sha256Digest
  // (crypto.subtle, for PKCE S256) and generateRandomData. The first two APIs
  // are exposed only in a secure context — HTTPS, or http on localhost /
  // 127.0.0.1 — so on plain http elsewhere init fails before any of our config
  // is even used, with a message that names none of this. Check up front.
  if (!window.isSecureContext || !window.crypto?.subtle || !window.crypto?.randomUUID) {
    renderFatal(
      `This page is served over an insecure connection (${window.location.protocol}//${window.location.host}), `
      + 'so the browser withholds the Web Crypto API that sign-in requires. '
      + 'Open the portal over HTTPS — or on localhost for local development.'
    )
    return
  }

  // Preserve the requested route across the login round-trip: the OAuth
  // redirect returns to the clean base URL, so stash the hash first.
  if (window.location.hash && !/(?:^|&)(state|access_token|code)=/.test(window.location.hash.slice(1))) {
    sessionStorage.setItem(RETURN_KEY, window.location.hash)
  }

  const stored = loadStoredTokens()

  let authenticated = false
  try {
    authenticated = await keycloak.init({
      ...stored,
      pkceMethod: 'S256',
      responseMode: 'query',
      redirectUri: appRedirectUri(),
      enableLogging: import.meta.env.DEV,
      // The stored-token restore above is what makes a returning visitor
      // silent; this periodic recheck would only add back the iframe risk
      // the whole scheme exists to avoid (see the comment above).
      checkLoginIframe: false,
    })
  } catch (err) {
    clearStoredTokens()
    renderFatal((err as Error)?.message || 'The identity provider could not be reached.')
    return
  }

  if (!authenticated) {
    clearStoredTokens()
    if (window.location.pathname !== '/home') {
      window.history.replaceState(null, '', '/home')
    }
    mount(<LandingPage onSignIn={signIn} />)
    return
  }

  // /home is only ever the anonymous view — a recognised visitor who landed
  // there anyway (a bookmark, the back button) belongs in the app instead.
  if (window.location.pathname === '/home') {
    window.history.replaceState(null, '', '/')
  }

  enterApp()
}

bootstrap()
