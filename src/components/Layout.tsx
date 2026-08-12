import type { ReactNode } from 'react'
import { FiExternalLink, FiGrid, FiLogOut, FiMenu, FiUser } from 'react-icons/fi'
import type { IconType } from 'react-icons'
import keycloak, { redirectUri } from '../auth/keycloak'
import { config } from '../config'
import { SERVICE_GROUPS } from '../lib/services'
import type { NavigateFn, View } from '../types'
import '../styles/Layout.css'

/**
 * Application shell — kept structurally identical to
 * dataops-ui/src/components/Layout.tsx (same AdminLTE markup, same navbar tool
 * links, same sidebar brand, content header, breadcrumb and footer), so moving
 * between DALI front ends is seamless.
 *
 * Differences from dataops-ui:
 *  - the sidebar lists reachable services as outbound links below the internal
 *    nav items, since the portal's job is dispatching to other apps;
 *  - the username in the navbar routes to the account page.
 */

// Mirrors dataops-ui. AdminLTE binds its sidebar toggle once on
// DOMContentLoaded via `document.querySelectorAll('[data-lte-toggle="sidebar"]')`,
// which runs before React renders this navbar — so the element never gets the
// listener, and because that listener is also what calls preventDefault(), an
// <a href="#"> toggle just clears the hash. Hence a real <button> plus these
// class manipulations, mirroring AdminLTE's PushMenu.
const SIDEBAR_COLLAPSE_CLASS = 'sidebar-collapse'
const SIDEBAR_OPEN_CLASS = 'sidebar-open'
const SIDEBAR_BREAKPOINT = 992

function toggleSidebar() {
  const body = document.body
  if (body.classList.contains(SIDEBAR_COLLAPSE_CLASS)) {
    body.classList.remove(SIDEBAR_COLLAPSE_CLASS)
    if (globalThis.innerWidth <= SIDEBAR_BREAKPOINT) body.classList.add(SIDEBAR_OPEN_CLASS)
  } else {
    body.classList.remove(SIDEBAR_OPEN_CLASS)
    body.classList.add(SIDEBAR_COLLAPSE_CLASS)
  }
}

interface ExternalTool {
  label: string
  url: string | undefined
  title: string
}

/** The 6G-DALI tool suite, linked from the navbar so the same set is reachable
 *  from every app. Each entry is dropped when its URL is unset rather than
 *  pointing somewhere that doesn't exist, so a partially configured deployment
 *  simply shows fewer links.
 *
 *  Same labels, order and titles as dataops-ui. The URLs come from the portal's
 *  runtime config rather than straight from import.meta.env, so they can be
 *  repointed without a rebuild — but they resolve from the *same* VITE_* names
 *  dataops-ui uses, so one deployment configures both apps identically. */
const EXTERNAL_TOOLS: ExternalTool[] = [
  {
    label: '6G-DALI',
    url: config.daliUrl,
    title: 'The 6G-DALI project site',
  },
  {
    label: 'Data Space',
    url: config.dataspaceUrl,
    title: 'Browse and search the 6G-DALI Data Space catalogue',
  },
  {
    label: 'Data Ops',
    url: config.dataopsUrl,
    title: 'Data Ops — pipelines, datasets and data quality',
  },
  {
    label: 'ML Ops',
    url: config.mlopsUrl,
    title: 'ML Ops — model training and serving',
  },
]

function ExternalToolLinks() {
  const tools = EXTERNAL_TOOLS.filter((tool): tool is ExternalTool & { url: string } =>
    Boolean(tool.url && tool.url.trim()))
  if (tools.length === 0) return null

  return (
    <>
      {tools.map(tool => (
        <li className="nav-item" key={tool.label}>
          {/* Text only. The label is always rendered — with no icon beside it,
              hiding it on narrow screens would leave an empty clickable box. */}
          <a
            className="nav-link external-tool-link"
            href={tool.url}
            // Separate tab: these are other applications. noreferrer alongside
            // noopener so the target can't reach back through window.opener.
            target="_blank"
            rel="noopener noreferrer"
            title={tool.title}
          >
            {tool.label}
          </a>
        </li>
      ))}
      <li className="nav-item external-tool-divider" aria-hidden="true" />
    </>
  )
}

interface NavItem {
  label: string
  view: View
  icon: IconType
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', view: 'overview', icon: FiGrid },
  { label: 'My account', view: 'account', icon: FiUser },
]

const PAGE_LABEL: Record<View, string> = {
  overview: 'Overview',
  account: 'My account',
}

interface SidebarLink {
  label: string
  href: string
  icon: IconType
}

/** Reachable services only — never render a link to something unavailable. */
function outboundLinks(): SidebarLink[] {
  return SERVICE_GROUPS.flatMap(group => group.services)
    .filter(service => service.availability === 'available' && service.url)
    .map(service => ({ label: service.name, href: service.url, icon: service.icon }))
}

interface LayoutProps {
  view: View
  onNavigate: NavigateFn
  children: ReactNode
}

export default function Layout({ view, onNavigate, children }: LayoutProps) {
  const links = outboundLinks()
  const pageLabel = PAGE_LABEL[view]

  return (
    <div className="app-wrapper">
      {/* Header / navbar */}
      <nav className="app-header navbar navbar-expand bg-body">
        <div className="container-fluid">
          <ul className="navbar-nav">
            <li className="nav-item">
              {/* A <button>, not an <a href="#"> — see toggleSidebar.
                  data-lte-toggle is deliberately omitted so AdminLTE cannot
                  also bind here and double-toggle. */}
              <button
                type="button"
                className="nav-link border-0 bg-transparent"
                onClick={toggleSidebar}
                aria-label="Toggle sidebar"
              >
                <FiMenu />
              </button>
            </li>
          </ul>
          <ul className="navbar-nav ms-auto align-items-center">
            <ExternalToolLinks />
            <li className="nav-item">
              {/* The username doubles as the route to account settings — the
                  convention users expect from a portal top bar (§7.2). */}
              <a
                href="#/account"
                className="navbar-text text-muted small account-link d-inline-flex align-items-center gap-1 me-2"
                onClick={e => { e.preventDefault(); onNavigate('account') }}
                title="Account settings"
              >
                <FiUser />
                {keycloak.tokenParsed?.preferred_username ?? keycloak.tokenParsed?.name ?? 'user'}
              </a>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                onClick={() => keycloak.logout({ redirectUri: redirectUri() })}
              >
                <FiLogOut />
                Logout
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Sidebar */}
      <aside className="app-sidebar bg-body-secondary shadow" data-bs-theme="dark">
        <div className="sidebar-brand">
          <a
            href="#/overview"
            className="brand-link"
            onClick={e => { e.preventDefault(); onNavigate('overview') }}
          >
            <span className="brand-text fw-light">
              6G-<span className="dali-accent">DALI</span> Portal
            </span>
          </a>
        </div>
        <div className="sidebar-wrapper">
          <nav className="mt-2">
            <ul className="nav sidebar-menu flex-column" role="menu">
              {NAV_ITEMS.map(item => {
                const Icon = item.icon
                return (
                  <li className="nav-item" key={item.view}>
                    <a
                      href={`#/${item.view}`}
                      className={`nav-link${view === item.view ? ' active' : ''}`}
                      onClick={e => { e.preventDefault(); onNavigate(item.view) }}
                    >
                      <Icon className="nav-icon" />
                      <p>{item.label}</p>
                    </a>
                  </li>
                )
              })}

              {links.length > 0 && <li className="nav-header">Services</li>}
              {links.map(link => {
                const Icon = link.icon
                return (
                  <li className="nav-item" key={link.href}>
                    <a
                      href={link.href}
                      className="nav-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon className="nav-icon" />
                      <p>
                        {link.label}
                        <FiExternalLink className="nav-external" aria-hidden="true" />
                      </p>
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="app-main">
        <div className="app-content-header">
          <div className="container-fluid">
            <div className="row align-items-center">
              <div className="col-sm-6">
                <h1 className="mb-0 h4">{pageLabel}</h1>
              </div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-end mb-0">
                  {view !== 'overview' && (
                    <li className="breadcrumb-item">
                      <a
                        href="#/overview"
                        onClick={e => { e.preventDefault(); onNavigate('overview') }}
                      >
                        Overview
                      </a>
                    </li>
                  )}
                  {/* §7.3: the current page is not clickable. */}
                  <li className="breadcrumb-item active">{pageLabel}</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <div className="app-content" id="main">
          <div className="container-fluid">{children}</div>
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="float-end d-none d-sm-inline">6G-DALI</div>
        <strong>Portal &mdash; entry point to the 6G-DALI data ecosystem.</strong>
      </footer>
    </div>
  )
}
