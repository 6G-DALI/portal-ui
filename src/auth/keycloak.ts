import { createKeycloak } from '@6g-dali/ui-shell'
import { config } from '../config'

/**
 * Single Keycloak adapter for the portal.
 *
 * The portal is the entry point to the 6G-DALI single sign-on environment: it
 * shares the realm with every other DALI front end (dataops-ui, the piveau
 * catalogue), so once a user authenticates here, following a link to another
 * service completes its own login silently against the existing SSO session.
 *
 * That only holds while realm and IdP host match across apps — which is why
 * they now come from the shared DaliBaseConfig keys rather than being written
 * out per application. The *client* differs per app, since each needs its own
 * redirect URIs.
 *
 * The adapter is created here, not in the package: each app owns its own
 * `init()` policy. See main.tsx for the portal's — it does not use
 * `check-sso` (unlike an earlier version of this file); the token storage
 * below replaces it.
 */
const keycloak = createKeycloak(config)
export default keycloak

/**
 * Always the app's single entry point, regardless of which page triggered the
 * redirect. `check-sso` used to run silently in a hidden iframe, so a visitor
 * could stay on whatever page they were on; without it, every Keycloak
 * round-trip (login, logout, silent token refresh) is a real top-level
 * navigation, and it always has to land somewhere that knows what to do with
 * the result — `/home` does not. main.tsx restores the pre-login hash
 * separately once the app is mounted, so nothing is lost by not returning to
 * the exact page a visitor started from.
 */
export function appRedirectUri(): string {
  return `${window.location.origin}/`
}

const TOKENS_KEY = 'portal_kc_tokens'

export interface StoredTokens {
  token: string
  refreshToken: string
  idToken?: string
}

/**
 * Client-side session persistence, replacing `check-sso`.
 *
 * `check-sso` discovers an existing session via a hidden iframe against
 * Keycloak — third-party cookies, which ad blockers, Incognito and ITP/ETP
 * all routinely restrict. Persisting the tokens ourselves sidesteps that
 * entirely: restoring them just hands a refresh token to `keycloak.init()`,
 * which validates/refreshes it with a plain same-origin-initiated fetch to
 * the token endpoint — no cookie ever has to cross an iframe boundary.
 *
 * The tradeoff, and it is a real one: a refresh token now sits in
 * `sessionStorage`, readable by any script that runs on this page. That is
 * the standard, accepted-risk approach for a public SPA client with no
 * backend of its own to hold it instead (§25 already rules out a backend
 * component for this app). sessionStorage rather than localStorage — it
 * should not outlive the tab.
 */
export function loadStoredTokens(): StoredTokens | null {
  try {
    const raw = sessionStorage.getItem(TOKENS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredTokens>
    if (!parsed.token || !parsed.refreshToken) return null
    return { token: parsed.token, refreshToken: parsed.refreshToken, idToken: parsed.idToken }
  } catch {
    return null
  }
}

/** Saves the adapter's current tokens, e.g. after `init()` or `updateToken()` succeeds. */
export function persistTokens(): void {
  if (!keycloak.token || !keycloak.refreshToken) return
  const tokens: StoredTokens = {
    token: keycloak.token,
    refreshToken: keycloak.refreshToken,
    idToken: keycloak.idToken,
  }
  sessionStorage.setItem(TOKENS_KEY, JSON.stringify(tokens))
}

/** Call on logout and on any failed refresh — a stale token must not be replayed. */
export function clearStoredTokens(): void {
  sessionStorage.removeItem(TOKENS_KEY)
}
