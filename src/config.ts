/**
 * Resolves service endpoints at RUNTIME, not build time.
 *
 * §27 warns that Vite env vars are baked into the bundle, so Docker Compose
 * `environment:` values cannot change an already-built image. Since this portal
 * is nothing but a set of URLs, a rebuild per environment would be absurd —
 * so it uses §27's option 2: a generated `config.js` loaded before the bundle.
 *
 * Resolution order per key:
 *   1. window.__PORTAL_CONFIG__  (public/config.js — editable in the container)
 *   2. import.meta.env.VITE_*    (build-time default, useful in dev)
 *   3. the fallback below
 */

export interface PortalConfig {
  /* ---- Shared 6G-DALI tool suite ----
     These four resolve from the SAME VITE_* names dataops-ui reads
     (VITE_DALI_URL, VITE_DATASPACE_URL, VITE_DATAOPS_URL, VITE_MLOPS_URL), so a
     single deployment configures the navbar links in both apps identically.
     Do not rename them without changing dataops-ui/src/components/Layout.tsx. */
  daliUrl: string
  dataspaceUrl: string
  dataopsUrl: string
  mlopsUrl: string

  repoApiUrl: string
  searchApiUrl: string
  authUrl: string
  orchestratorUrl: string
  northboundApiUrl: string
  edcConnectorUrl: string
  /* ---- Single sign-on ----
     Realm and IdP host must match the other DALI front ends for the shared SSO
     session to work; the client is per-application. */
  keycloakRealm: string
  keycloakClientId: string
}

declare global {
  interface Window {
    __PORTAL_CONFIG__?: Partial<Record<keyof PortalConfig, string>>
  }
}

const DEFAULTS: PortalConfig = {
  // Shared tool suite. Empty by default: an unset URL drops the navbar link
  // rather than pointing somewhere that does not exist.
  daliUrl: 'https://6gdali.eu/',
  dataspaceUrl: 'https://catalogue.dspace.sparkworks.net',
  dataopsUrl: '',
  mlopsUrl: '',

  repoApiUrl: 'https://dspace.sparkworks.net',
  searchApiUrl: 'https://search.dspace.sparkworks.net',
  authUrl: 'https://auth.dspace.sparkworks.net/auth',
  orchestratorUrl: '',
  northboundApiUrl: '',
  edcConnectorUrl: '',
  keycloakRealm: 'dspace',
  keycloakClientId: 'dali-portal',
}

const ENV_KEYS: Record<keyof PortalConfig, string> = {
  // Identical names to dataops-ui — see PortalConfig above.
  daliUrl: 'VITE_DALI_URL',
  dataspaceUrl: 'VITE_DATASPACE_URL',
  dataopsUrl: 'VITE_DATAOPS_URL',
  mlopsUrl: 'VITE_MLOPS_URL',

  repoApiUrl: 'VITE_REPO_API_URL',
  searchApiUrl: 'VITE_SEARCH_API_URL',
  authUrl: 'VITE_AUTH_URL',
  orchestratorUrl: 'VITE_ORCHESTRATOR_URL',
  northboundApiUrl: 'VITE_NORTHBOUND_API_URL',
  edcConnectorUrl: 'VITE_EDC_CONNECTOR_URL',
  keycloakRealm: 'VITE_KEYCLOAK_REALM',
  keycloakClientId: 'VITE_KEYCLOAK_CLIENT_ID',
}

function resolve(key: keyof PortalConfig): string {
  const runtime = window.__PORTAL_CONFIG__?.[key]
  if (runtime) return stripTrailingSlash(runtime)

  const buildTime = import.meta.env[ENV_KEYS[key]] as string | undefined
  if (buildTime) return stripTrailingSlash(buildTime)

  return DEFAULTS[key]
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') && url.length > 1 ? url.slice(0, -1) : url
}

export const config: PortalConfig = {
  daliUrl: resolve('daliUrl'),
  dataspaceUrl: resolve('dataspaceUrl'),
  dataopsUrl: resolve('dataopsUrl'),
  mlopsUrl: resolve('mlopsUrl'),
  repoApiUrl: resolve('repoApiUrl'),
  searchApiUrl: resolve('searchApiUrl'),
  authUrl: resolve('authUrl'),
  orchestratorUrl: resolve('orchestratorUrl'),
  northboundApiUrl: resolve('northboundApiUrl'),
  edcConnectorUrl: resolve('edcConnectorUrl'),
  keycloakRealm: resolve('keycloakRealm'),
  keycloakClientId: resolve('keycloakClientId'),
}
