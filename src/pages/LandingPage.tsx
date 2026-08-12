import { FiArrowRight, FiExternalLink, FiLock } from 'react-icons/fi'
import { DOCUMENTATION, SERVICE_GROUPS } from '../lib/services'
import { config } from '../config'

/**
 * Public landing page — the only view an unauthenticated visitor sees.
 *
 * Follows §13.1's full-screen split layout: identity and context on the left,
 * the sign-in action on the right, and no application navigation.
 *
 * It deliberately does **not** render username/password fields. Authentication
 * is delegated to Keycloak's hosted login form, so the portal never handles
 * credentials — collecting them here would add a phishing-shaped surface for no
 * benefit (§25).
 *
 * Everything shown is non-sensitive: service *names* and public specification
 * links, never endpoint URLs or anything that would help an anonymous visitor
 * probe the deployment.
 */

interface LandingPageProps {
  onSignIn: () => void
  /** Set when a silent SSO check failed rather than simply finding no session. */
  notice?: string | null
}

export default function LandingPage({ onSignIn, notice }: LandingPageProps) {
  const serviceNames = SERVICE_GROUPS.flatMap(group =>
    group.services.map(service => service.name))

  return (
    <div className="landing">
      {/* ── Left: identity and context ─────────────────────────────────── */}
      <section className="landing-brand">
        <div className="landing-brand-inner">
          <div className="landing-identity">
            <span className="landing-mark" aria-hidden="true">6G</span>
            <span className="landing-wordmark">
              DALI<span className="landing-wordmark-accent">·</span>Portal
            </span>
          </div>

          <h1 className="landing-title">
            The 6G-DALI data ecosystem, in one place.
          </h1>

          <p className="landing-lede">
            6G-DALI builds a federated data space for 5G and 6G testbed data: measurement
            datasets, the pipelines that clean and enrich them, and the machine-learning
            models trained on them — described with a shared metadata profile so results
            stay findable and reusable across projects.
          </p>

          <dl className="landing-facts">
            <div>
              <dt>Programme</dt>
              <dd>Smart Networks and Services Joint Undertaking (SNS JU)</dd>
            </div>
            <div>
              <dt>Metadata</dt>
              <dd>DCAT-AP 3.0, extended for GAIA-X, SNS-JU CMT, DQV and MLDCAT-AP</dd>
            </div>
            <div>
              <dt>Behind sign-in</dt>
              <dd>{serviceNames.join(' · ')}</dd>
            </div>
          </dl>

          <ul className="landing-links">
            <li>
              <a href={config.daliUrl} target="_blank" rel="noopener noreferrer">
                Project website <FiExternalLink aria-hidden="true" />
              </a>
            </li>
            {DOCUMENTATION.filter(doc => doc.id !== 'project').slice(0, 3).map(doc => (
              <li key={doc.id}>
                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                  {doc.name} <FiExternalLink aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Right: the sign-in action ───────────────────────────────────── */}
      <section className="landing-action" aria-labelledby="signin-heading">
        <div className="landing-action-inner">
          <h2 className="landing-action-title" id="signin-heading">Sign in</h2>
          <p className="landing-action-text">
            The portal and every DALI service share one account. Signing in here gives you
            access to all of them without logging in again.
          </p>

          {/* A failed silent check is worth stating — otherwise a blocked
              third-party cookie looks like "the portal forgot me" (§20). */}
          {notice && (
            <div className="alert alert-warning" role="status">{notice}</div>
          )}

          <button
            type="button"
            className="btn btn-primary d-inline-flex align-items-center gap-2"
            onClick={onSignIn}
          >
            Continue to sign in
            <FiArrowRight aria-hidden="true" />
          </button>

          <p className="landing-action-note">
            <FiLock aria-hidden="true" /> You will be redirected to the 6G-DALI identity
            provider. Your credentials are never entered on this page.
          </p>

          <p className="landing-action-help">
            No account? Accounts are issued by your consortium partner — contact your
            testbed or work-package lead.
          </p>
        </div>
      </section>

      <footer className="landing-footer">
        <span>6G-DALI · Smart Networks and Services Joint Undertaking</span>
      </footer>
    </div>
  )
}
