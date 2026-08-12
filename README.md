# 6G-DALI Portal

Central entry point for the 6G-DALI data ecosystem: a single dashboard listing
every service (catalogue, DataOps, MLOps, APIs, identity) and the specifications
they conform to.

Built to `general_gui_guidelines.md` — same design tokens, typography and motion
as `dataops/dataops-ui`.

## Stack

React 18 + Vite + TypeScript with Bootstrap 5 + AdminLTE 4 — **the same stack,
same shell and same theme layer as `dataops/dataops-ui`**, so the two
applications are indistinguishable to a user moving between them.

Uniformity is enforced concretely:

- `styles/tokens.css`, `theme.css`, `ui.css` and `animations.css` are **copied
  byte-for-byte** from `dataops-ui` (verify with `sha256sum`).
- `components/Layout.tsx` reproduces `dataops-ui`'s AdminLTE markup exactly —
  same header navbar (including the **6G-DALI / Data Space / Data Ops / ML Ops**
  tool links and their divider), the same real-`<button>` sidebar toggle and its
  AdminLTE PushMenu class handling, sidebar brand, content header, breadcrumb bar
  and footer.
- The navbar tool links resolve from the **same env var names dataops-ui reads** —
  `VITE_DALI_URL`, `VITE_DATASPACE_URL`, `VITE_DATAOPS_URL`, `VITE_MLOPS_URL` — so
  one deployment configures both apps' links identically. Renaming them here
  requires changing `dataops-ui/src/components/Layout.tsx` too.
- `admin-lte` is **pinned to 4.0.2** (`--save-exact`) to match `dataops-ui`.
  The caret range resolved to 4.3.1 and would have drifted the shell.
- `index.html` carries the same `data-bs-theme="dark"` and AdminLTE body
  classes, and the same pre-paint background.
- Fonts: the same `@fontsource` packages, subsets and weights.

`styles/portal.css` and the appended block in `styles/Layout.css` hold the only
portal-specific rules (service cards, documentation list, sidebar service group,
environment badge), all built from the shared tokens.

## Running

```bash
npm install
npm run dev          # http://localhost:3100
npm run build        # tsc --noEmit && vite build
npm run type-check
```

## Single sign-on

The portal is the **entry point to the 6G-DALI SSO environment**. It boots behind
Keycloak with `onLoad: 'login-required'` (authorization code + PKCE, identical to
`dataops-ui/src/main.tsx`), so arriving here establishes the realm session that
every other DALI front end then reuses silently — a user who clicks through to
DataOps or the catalogue is not asked to log in again.

That only holds while **realm and IdP host match across applications**. The
*client* is per-application, because each needs its own redirect URIs.

### Required Keycloak setup

The default client id is `dali-portal`, and **it must be created in the realm
before the portal will load** — otherwise Keycloak rejects the redirect:

| Setting | Value |
|---|---|
| Realm | `dspace` (must match `dataops-ui`) |
| Client ID | `dali-portal` |
| Client type | Public (no secret; the portal is browser-only) |
| Auth flow | Standard flow, PKCE `S256` |
| Valid redirect URIs | the portal origin, e.g. `https://portal.dspace.sparkworks.net/*` |
| Valid post-logout redirect URIs | the same origin |
| Web origins | the same origin |

Change realm or client via `keycloakRealm` / `keycloakClientId` in
`public/config.js` — no rebuild needed.

The sidebar lists only services whose URL is configured and reachable, so it
never offers a link that fails.

## My account page

`pages/AccountPage.tsx` lets a signed-in user edit their own profile
(first name, last name, email) through the **Keycloak Account REST API** at
`{authUrl}/realms/{realm}/account`, without leaving the portal.

- `GET /account/` loads the profile; **`POST /account/`** saves it (Keycloak uses
  POST on the collection root for updates, and *replaces* the representation —
  so the whole editable set is sent, not a sparse patch).
- Writability comes from the response's `userProfileMetadata`, so a realm that
  pins email or names read-only is respected rather than assumed writable.
- Username is displayed but never editable — it is an identity, and Keycloak only
  permits changes when the realm allows it.
- Password, two-factor enrolment, sessions and linked identity providers are
  **deliberately not reimplemented**; the page links to Keycloak's own account
  console for those.

### Two Keycloak prerequisites

Both fail as a bare `401`/`403`, so they are easy to misdiagnose. The page turns
them into an explicit message rather than "failed":

1. **Token audience.** A token minted for `dali-portal` does not include the
   `account` audience by default. Add a dedicated mapper:
   *Clients → dali-portal → Client scopes → dali-portal-dedicated → Add mapper →
   By configuration → Audience → Included client audience: `account`*.
2. **Roles.** The user needs the `account` client roles `view-profile` and
   `manage-account`, normally granted via the realm's `default-roles-<realm>`
   composite.

CORS needs nothing extra: the account endpoints already answer the preflight for
the portal origin (verified — `Authorization` is in `access-control-allow-headers`
and `POST` in `access-control-allow-methods`), because they honour the same Web
Origins list as the token endpoint.

## Configuration

Service URLs, the realm and the client id all resolve at **runtime**, in this
order:

1. `window.__PORTAL_CONFIG__` — from `public/config.js`
2. `import.meta.env.VITE_*` — build-time, convenient in dev
3. defaults in `src/config.ts`

§27 warns that Vite bakes `VITE_*` into the bundle, so Compose `environment:`
entries cannot change an already-built image. Since this portal is *nothing but
URLs*, rebuilding per environment would be absurd — hence `config.js`, which can
be replaced at deploy time:

```yaml
services:
  portal:
    build: ./portal
    ports:
      - "127.0.0.1:11098:80"
    volumes:
      - ./portal-config.js:/usr/share/nginx/html/config.js:ro
```

nginx serves `config.js` with `no-store`, so a URL change reaches browsers
immediately instead of being masked by the one-year asset cache.

### Availability states

`src/lib/services.ts` declares availability; **nothing is probed**. The portal
has no backend, and inventing status lights would be decoration that
communicates nothing real (§2.3).

| State | Meaning | Rendering |
|---|---|---|
| `available` | URL configured and browser-reachable | Clickable card, host shown |
| `internal` | Exists but bound to loopback on the host | Inert card + reason |
| `planned` | Not deployed yet | Inert card + reason |

A service whose configured URL is **empty degrades to `planned` automatically**,
so an unconfigured deployment shows an honest gap rather than a dead link.

Currently `internal`: the SPARQL endpoint (Virtuoso is loopback-bound — see
`dataspace/MIGRATION.md` §7). Currently `planned`: MLOps, plus any service whose
URL is still blank in `config.js` (DataOps, Orchestrator, Northbound API, EDC
Connector at the time of writing).

The same URLs drive both the dashboard cards and the navbar tool links, so there
is one place to set each: `dataspaceUrl` is the catalogue, `dataopsUrl` the
DataOps app, `mlopsUrl` MLOps, `daliUrl` the project site. There is deliberately
no separate `catalogueUrl`/`projectUrl` — duplicate keys for one URL are how
these two apps drift apart.

## Routing

Two views, hash-routed in `App.tsx` (`#/overview`, `#/account`) — the same
approach dataops-ui uses, so both apps behave identically in the address bar.
Two views does not justify React Router; when the portal grows, both apps should
migrate together (§9).

## Adding a service

Append to the relevant group in `src/lib/services.ts`, add its URL key to
`PortalConfig`/`ENV_KEYS` in `src/config.ts`, and set it in `public/config.js`.
No component changes needed.

## CI

`.github/workflows/portal-ui.yml` builds and pushes the container image to
`ghcr.io/<owner>/portal-ui` on every push to `main`, and on manual dispatch.
It mirrors `6G-DALI/dataops/.github/workflows/dataops-orchestrator.yml`; the only
structural difference is that the portal is its own repository, so the build
context is the repo root and no `paths:` filter is needed.

Tags follow the same scheme: the commit SHA, plus `latest` on `main`.

There is no separate type-check job — the Dockerfile runs `npm run build`, which
is `tsc --noEmit && vite build`, so a type error fails the image build.

`npm ci` requires **`package-lock.json` to be committed**, and `admin-lte` is
pinned exactly (`4.0.2`, no caret) so CI cannot pull a newer shell than
`dataops-ui` uses.

`.dockerignore` excludes `node_modules` — without it, the Dockerfile's
`COPY . .` would overwrite the `node_modules` that `npm ci` built inside the
image with the host's, which on macOS means darwin/arm64 native binaries
(esbuild, rollup) in a linux image. It also keeps `.env` out of the image:
service URLs belong in `public/config.js` at runtime, never baked in.

## Structure

```
portal/
├── .github/workflows/    # portal-ui.yml — build and push to GHCR
├── .dockerignore         # keeps host node_modules and .env out of the image
├── index.html            # loads config.js before the bundle
├── public/config.js      # runtime configuration
├── Dockerfile            # node build → nginx (§27)
├── nginx.conf            # SPA routing, cache policy, CSP (§25)
└── src/
    ├── main.tsx          # Keycloak bootstrap (mirrors dataops-ui)
    ├── auth/keycloak.ts  # shared-realm adapter
    ├── config.ts         # runtime → build-time → default resolution
    ├── lib/services.ts   # the service registry (all content lives here)
    ├── components/
    │   ├── Layout.tsx    # AdminLTE shell, mirrors dataops-ui
    │   └── domain/ServiceCard.tsx
    ├── pages/DashboardPage.tsx
    └── styles/           # tokens/theme/ui/animations copied from dataops-ui
                          # Layout.css + portal.css for portal-only rules
```

### Known duplication

`styles/tokens.css`, `theme.css`, `ui.css` and `animations.css` are **verbatim
copies** of the `dataops-ui` files, and `Layout.tsx` duplicates its shell markup.
This is what keeps the two front ends uniform, but it means a theme change must
now be applied twice. Two copies is tolerable; **before a third front end is
added, extract the theme layer and the shell into a shared workspace package.**

`admin-lte` is pinned exactly for the same reason — an unpinned upgrade in one
app would silently break uniformity.

**This has already bitten once:** `dataops-ui`'s `Layout.tsx` gained the navbar
tool links and the sidebar-toggle fix while the portal was being written, so the
portal's copy was stale within the same day. Re-sync procedure:

```bash
# from portal/
cp ../dataops/dataops-ui/src/styles/{tokens,theme,ui,animations}.css src/styles/
cp ../dataops/dataops-ui/src/styles/Layout.css src/styles/   # then re-append the
                                                             # portal-only block
sha256sum src/styles/*.css ../dataops/dataops-ui/src/styles/*.css   # verify
```

## Deviations from the guidelines

Recorded so they are choices, not oversights:

- **No Tailwind / Radix / TanStack Query / Zustand** (§9). The portal matches
  `dataops-ui`'s Bootstrap + AdminLTE shell instead, because uniformity with the
  sibling application was the explicit requirement; introducing a second styling
  system would defeat it. Nothing here fetches data, so the state libraries would
  be unused dependencies — add them with the first live data.
- **No metric cards or activity feed** (§13.2). Both need live data this page
  does not have.
- **Sidebar has one internal item.** §6.1's shell is kept for uniformity, so the
  sidebar exists and is populated with outbound service links below "Overview".

## Follow-ups

- Real health probes per service, feeding the existing `availability` field —
  the one addition that would make this a genuine operations dashboard.
- Link documentation to the published MAP and guideline documents; the two
  internal doc entries currently point at the GitHub org placeholder because
  neither has a public URL yet.
- Role-aware navigation: the SSO session is already available, so the next step
  is reading realm roles from the token and hiding services the signed-in user
  cannot use (§18.3). Authorisation stays server-side; this is UX only.
- Extract the shared theme layer and AdminLTE shell into a workspace package, so
  `dataops-ui` and the portal stop duplicating them.
