/**
 * Resolves service endpoints at RUNTIME, not build time.
 *
 * §27 warns that Vite env vars are baked into the bundle, so Docker Compose
 * `environment:` values cannot change an already-built image. Since this portal
 * is nothing but a set of URLs, a rebuild per environment would be absurd —
 * so it uses §27's option 2: a generated `config.js` loaded before the bundle.
 *
 * The resolver itself now lives in @6g-dali/ui-shell, so the portal and
 * dataops-ui cannot drift apart on precedence, on the VITE_* names for the
 * shared keys, or on URL normalisation. Resolution order per key:
 *
 *   1. window.__DALI_CONFIG__    (public/config.js — editable in the container)
 *   2. import.meta.env.VITE_*    (build-time default, useful in dev)
 *   3. the fallback below
 *
 * The entrypoint script emits __DALI_CONFIG__. window.__PORTAL_CONFIG__ is
 * still read as a fallback, for a deployment that mounts a config.js written
 * before the key was unified; drop it once none remain.
 */
import { resolveConfig, DALI_ENV_KEYS, type DaliBaseConfig } from '@6g-dali/ui-shell'

/**
 * The shared keys — the 6G-DALI tool suite and single sign-on — come from
 * DaliBaseConfig, which is what guarantees the navbar links and the SSO realm
 * are described identically in every front end. Below are the portal's own.
 */
export interface PortalConfig extends DaliBaseConfig {
  repoApiUrl: string
  searchApiUrl: string
  orchestratorUrl: string
  northboundApiUrl: string
  edcConnectorUrl: string
  /* Endpoint returning the landing-page counts. Empty means "not wired up yet",
     and the portal falls back to placeholder figures — see lib/stats.ts. */
  statsApiUrl: string
}

export const config = resolveConfig<PortalConfig>({
  defaults: {
    // Shared tool suite. Empty by default: an unset URL drops the navbar link
    // rather than pointing somewhere that does not exist.
    daliUrl: 'https://6gdali.eu/',
    // This app's own public URL. Empty by default so the navbar entry is
    // dropped rather than pointing at a guess; set it per deployment.
    portalUrl: '',
    dataspaceUrl: 'https://catalogue.dspace.sparkworks.net',
    dataopsUrl: '',
    mlopsUrl: '',

    // Single sign-on. Realm and IdP host must match the other DALI front ends
    // for the shared session to work; the client is per-application.
    authUrl: 'https://auth.dspace.sparkworks.net/auth',
    keycloakRealm: 'dspace',
    keycloakClientId: 'dali-portal',

    repoApiUrl: 'https://dspace.sparkworks.net',
    searchApiUrl: 'https://search.dspace.sparkworks.net',
    orchestratorUrl: '',
    northboundApiUrl: '',
    edcConnectorUrl: '',
    statsApiUrl: '',
  },
  envKeys: {
    // The shared names (VITE_DALI_URL, VITE_AUTH_URL, …) come from the package,
    // so renaming one is a single change that reaches every front end.
    ...DALI_ENV_KEYS,

    repoApiUrl: 'VITE_REPO_API_URL',
    searchApiUrl: 'VITE_SEARCH_API_URL',
    orchestratorUrl: 'VITE_ORCHESTRATOR_URL',
    northboundApiUrl: 'VITE_NORTHBOUND_API_URL',
    edcConnectorUrl: 'VITE_EDC_CONNECTOR_URL',
    statsApiUrl: 'VITE_STATS_API_URL',
  },
  // Passed in rather than read inside the package: `import.meta.env` is
  // substituted by Vite in *this* file, and a pre-bundled dependency cannot
  // count on that substitution reaching it.
  env: import.meta.env,
})
