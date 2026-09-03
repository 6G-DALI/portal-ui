import type { ReactNode } from 'react'
import { FiGrid, FiUser } from 'react-icons/fi'
import {
  AppShell,
  daliTools,
  usernameOf,
  type Crumb,
  type NavItem,
} from '@6g-dali/ui-shell'
import keycloak, { appRedirectUri, clearStoredTokens } from '../auth/keycloak'
import { config } from '../config'
import type { NavigateFn, View } from '../types'

/**
 * The portal's application shell.
 *
 * The frame itself — navbar, sidebar, content header, breadcrumb, footer — is
 * @6g-dali/ui-shell's AppShell, shared with dataops-ui. This file is now only
 * the portal's answers to it: its brand, its two views, its breadcrumb, and the
 * fact that its account page is one of its own routes rather than a link out.
 *
 * The sidebar carries only the portal's own views. The tool suite is already in
 * the navbar, and duplicating it below made the same five links appear twice on
 * every page.
 */

const NAV_ITEMS: NavItem<View>[] = [
  { label: 'Overview', view: 'overview', icon: FiGrid },
  { label: 'My account', view: 'account', icon: FiUser },
]

const PAGE_LABEL: Record<View, string> = {
  overview: 'Overview',
  account: 'My account',
}

interface LayoutProps {
  view: View
  onNavigate: NavigateFn
  children: ReactNode
}

export default function Layout({ view, onNavigate, children }: LayoutProps) {
  // Two levels at most, so the trail is built inline rather than from a table.
  // AppShell renders the last crumb as the inactive current page (§7.3), which
  // is why 'Overview' needs no special casing when it is the only entry.
  const breadcrumbs: Crumb[] =
    view === 'overview'
      ? [{ label: PAGE_LABEL.overview }]
      : [
          { label: PAGE_LABEL.overview, onSelect: () => onNavigate('overview') },
          { label: PAGE_LABEL[view] },
        ]

  return (
    <AppShell<View>
      brand={<>6G-<span className="dali-accent">DALI</span> Portal</>}
      homeView="overview"
      nav={NAV_ITEMS}
      activeView={view}
      onNavigate={onNavigate}
      tools={daliTools(config)}
      breadcrumbs={breadcrumbs}
      username={usernameOf(keycloak)}
      // The username doubles as the route to account settings — the convention
      // users expect from a portal top bar (§7.2). Unlike dataops-ui, which
      // links out to this app, the page is one of the portal's own views.
      account={{ onSelect: () => onNavigate('account') }}
      onLogout={() => {
        // Keycloak's own logout only ends the server-side session; the stored
        // refresh token would otherwise still restore it on the next load.
        clearStoredTokens()
        keycloak.logout({ redirectUri: appRedirectUri() })
      }}
      footer={<strong>Portal &mdash; entry point to the 6G-DALI data ecosystem.</strong>}
      // Injected by vite.config.ts: the commit this bundle was built from, so a
      // deployed page can be traced back to a revision without guessing.
      build={__BUILD_SHA__}
    >
      {children}
    </AppShell>
  )
}
