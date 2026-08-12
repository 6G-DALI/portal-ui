import Keycloak from 'keycloak-js'
import { config } from '../config'

/**
 * Single Keycloak adapter for the portal.
 *
 * The portal is the entry point to the 6G-DALI single sign-on environment: it
 * shares the realm with every other DALI front end (dataops-ui, the piveau
 * catalogue), so once a user authenticates here, following a link to another
 * service completes its own login silently against the existing SSO session.
 *
 * That only holds while realm and IdP host match across apps — keep these
 * values in step with dataops-ui/src/auth/keycloak.ts. The *client* differs per
 * application, since each needs its own redirect URIs.
 */
const keycloak = new Keycloak({
  url: config.authUrl,
  realm: config.keycloakRealm,
  clientId: config.keycloakClientId,
})

/** Clean base URL (no hash) used as the OAuth redirect target. */
export function redirectUri(): string {
  return window.location.origin + window.location.pathname
}

export default keycloak
