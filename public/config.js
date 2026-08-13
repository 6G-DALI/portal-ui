/*
 * Runtime configuration for the 6G-DALI Portal.
 *
 * Served as a static file, so it can be replaced at deploy time by a Docker
 * volume mount, a ConfigMap, or an entrypoint script — no image rebuild needed.
 * Leave a value empty to fall back to the build-time default; leave a service
 * URL empty to have it shown as "Planned" instead of as a broken link.
 */
window.__PORTAL_CONFIG__ = {
  // Shared 6G-DALI tool suite — these four drive the navbar links and use the
  // SAME names dataops-ui reads, so one config covers both apps. Leave a URL
  // empty to drop its navbar link rather than point at nothing.
  daliUrl: 'https://6gdali.eu/',
  // This app's own public URL — drives the "Portal" navbar entry.
  portalUrl: 'https://portal-6gdali.sparkworks.net',
  dataspaceUrl: 'https://catalogue.dspace.sparkworks.net',
  dataopsUrl: '',
  mlopsUrl: '',

  // Data space
  repoApiUrl: 'https://dspace.sparkworks.net',
  searchApiUrl: 'https://search.dspace.sparkworks.net',

  // Pipelines — fill these in once the services have public hostnames.
  orchestratorUrl: '',

  // Interoperability
  northboundApiUrl: '',
  edcConnectorUrl: '',

  // Landing-page counts. Empty means the landing page shows clearly-labelled
  // placeholder figures; point this at an endpoint returning
  // { datasets, catalogues, pipelines, models } to show real ones.
  statsApiUrl: '',

  // Platform
  authUrl: 'https://auth.dspace.sparkworks.net/auth',

  // Single sign-on. Realm and IdP host MUST match the other DALI front ends for
  // the shared session to work; the client is specific to this application and
  // must exist in the realm with this origin in its redirect URIs.
  keycloakRealm: 'dspace',
  keycloakClientId: 'dali-portal',

}
