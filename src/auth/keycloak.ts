import { createKeycloak, redirectUri } from '@6g-dali/ui-shell'
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
 * `init()` policy. main.tsx uses `check-sso` so the landing page stays public,
 * where dataops-ui forces `login-required`.
 */
export { redirectUri }

export default createKeycloak(config)
