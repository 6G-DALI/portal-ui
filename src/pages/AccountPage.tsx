import { useCallback, useEffect, useState } from 'react'
import {
  FiAlertTriangle,
  FiCheck,
  FiExternalLink,
  FiRefreshCw,
} from 'react-icons/fi'
import {
  AccountApiError,
  accountConsoleUrl,
  attributeMeta,
  getAccount,
  updateAccount,
  type Account,
  type AccountPatch,
} from '../api/account'

/**
 * Personal account settings, backed by the Keycloak Account REST API.
 *
 * Scope is deliberately just the profile fields. Password, two-factor
 * enrolment, sessions and linked identity providers are reachable through the
 * Keycloak account console (linked at the bottom) — reimplementing credential
 * flows in a portal page would add risk for no benefit.
 *
 * Field writability comes from the realm's user profile metadata rather than
 * being assumed, so a realm that pins email or names read-only is respected.
 */

interface FormState {
  firstName: string
  lastName: string
  email: string
}

const EMPTY_FORM: FormState = { firstName: '', lastName: '', email: '' }

function toForm(account: Account): FormState {
  return {
    firstName: account.firstName ?? '',
    lastName: account.lastName ?? '',
    email: account.email ?? '',
  }
}

/** Client-side checks are convenience only — Keycloak validates server-side
 *  (§25) and its field errors are merged in on submit. */
function validate(form: FormState, account: Account | null): Record<string, string> {
  const errors: Record<string, string> = {}

  const emailMeta = attributeMeta(account, 'email')
  if (!form.email.trim()) {
    if (emailMeta?.required !== false) errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  if (attributeMeta(account, 'firstName')?.required !== false && !form.firstName.trim()) {
    errors.firstName = 'First name is required.'
  }
  if (attributeMeta(account, 'lastName')?.required !== false && !form.lastName.trim()) {
    errors.lastName = 'Last name is required.'
  }

  return errors
}

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await getAccount()
      setAccount(data)
      setForm(toForm(data))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load your account.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function change(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear a field's error as soon as the user edits it, and drop the stale
    // "saved" confirmation — it no longer describes what is on screen.
    setFieldErrors(prev => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
    setSaved(false)
  }

  /** §15.2: validate on blur for fields with clear constraints. */
  function blur(field: keyof FormState) {
    const errors = validate(form, account)
    setFieldErrors(prev => ({ ...prev, ...(errors[field] ? { [field]: errors[field] } : {}) }))
  }

  const readOnly = (name: keyof FormState) => Boolean(attributeMeta(account, name)?.readOnly)
  const dirty = account !== null
    && (form.firstName !== (account.firstName ?? '')
      || form.lastName !== (account.lastName ?? '')
      || form.email !== (account.email ?? ''))

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaveError(null)
    setSaved(false)

    const errors = validate(form, account)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    // Keycloak replaces the representation, so send the whole editable set.
    const patch: AccountPatch = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
    }

    setSaving(true)
    try {
      await updateAccount(patch)
      setFieldErrors({})
      setSaved(true)
      // Re-read rather than trusting the local copy: changing an email can
      // reset emailVerified, and the realm may normalise values.
      await load()
    } catch (err) {
      if (err instanceof AccountApiError) {
        setSaveError(err.message)
        setFieldErrors(err.fieldErrors)
      } else {
        setSaveError(err instanceof Error ? err.message : 'Could not save your changes.')
      }
    } finally {
      setSaving(false)
    }
  }

  /* §20 loading: a skeleton shaped like the form, not a page-wide spinner. */
  if (loading && !account) {
    return (
      <div className="row" aria-busy="true">
        <div className="col-12 col-lg-8">
          <div className="card">
            <div className="card-header">Personal information</div>
            <div className="card-body">
              {[0, 1, 2, 3].map(i => (
                <div className="mb-3" key={i}>
                  <div className="skeleton skeleton-label" />
                  <div className="skeleton" style={{ height: 34 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* §20 error with nothing to fall back on. */
  if (loadError && !account) {
    return (
      <div className="card state-panel" role="alert">
        <div className="card-body text-center">
          <FiAlertTriangle className="state-panel-icon text-danger" aria-hidden="true" />
          <h2 className="state-panel-title">Account unavailable</h2>
          <p className="state-panel-text">{loadError}</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={load}>
            <FiRefreshCw className="me-1" aria-hidden="true" /> Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="row g-3">
      <div className="col-12 col-lg-8">
        <form className="card" onSubmit={submit} noValidate>
          <div className="card-header">Personal information</div>
          <div className="card-body">

            {/* Page-level feedback stays inline — §21 forbids a toast being the
                only place a validation or save failure appears. */}
            {saveError && (
              <div className="alert alert-danger" role="alert">{saveError}</div>
            )}
            {saved && !dirty && (
              <div className="alert alert-success d-flex align-items-center gap-2" role="status">
                <FiCheck aria-hidden="true" /> Your changes have been saved.
              </div>
            )}

            {/* Username: Keycloak only permits changes when the realm allows it,
                and it is an identity rather than a profile field. Shown for
                reference, never editable here. */}
            <div className="mb-3">
              <label className="form-label small" htmlFor="account-username">Username</label>
              <input
                id="account-username"
                className="form-control font-monospace"
                value={account?.username ?? ''}
                readOnly
                disabled
              />
              <div className="form-text">Managed by your identity provider.</div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label small" htmlFor="account-firstname">
                    First name {attributeMeta(account, 'firstName')?.required !== false
                      && <span className="text-danger">*</span>}
                  </label>
                  <input
                    id="account-firstname"
                    className={`form-control${fieldErrors.firstName ? ' is-invalid' : ''}`}
                    value={form.firstName}
                    onChange={e => change('firstName', e.target.value)}
                    onBlur={() => blur('firstName')}
                    readOnly={readOnly('firstName')}
                    aria-invalid={Boolean(fieldErrors.firstName)}
                    aria-describedby={fieldErrors.firstName ? 'err-firstname' : undefined}
                  />
                  {/* §15.1: error directly below the affected control. */}
                  {fieldErrors.firstName && (
                    <div className="invalid-feedback d-block" id="err-firstname">
                      {fieldErrors.firstName}
                    </div>
                  )}
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label small" htmlFor="account-lastname">
                    Last name {attributeMeta(account, 'lastName')?.required !== false
                      && <span className="text-danger">*</span>}
                  </label>
                  <input
                    id="account-lastname"
                    className={`form-control${fieldErrors.lastName ? ' is-invalid' : ''}`}
                    value={form.lastName}
                    onChange={e => change('lastName', e.target.value)}
                    onBlur={() => blur('lastName')}
                    readOnly={readOnly('lastName')}
                    aria-invalid={Boolean(fieldErrors.lastName)}
                    aria-describedby={fieldErrors.lastName ? 'err-lastname' : undefined}
                  />
                  {fieldErrors.lastName && (
                    <div className="invalid-feedback d-block" id="err-lastname">
                      {fieldErrors.lastName}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small" htmlFor="account-email">
                Email {attributeMeta(account, 'email')?.required !== false
                  && <span className="text-danger">*</span>}
              </label>
              <input
                id="account-email"
                type="email"
                className={`form-control${fieldErrors.email ? ' is-invalid' : ''}`}
                value={form.email}
                onChange={e => change('email', e.target.value)}
                onBlur={() => blur('email')}
                readOnly={readOnly('email')}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'err-email' : 'hint-email'}
              />
              {fieldErrors.email ? (
                <div className="invalid-feedback d-block" id="err-email">{fieldErrors.email}</div>
              ) : (
                <div className="form-text" id="hint-email">
                  {account?.emailVerified
                    ? 'Verified. Changing it may require verifying the new address again.'
                    : 'Not verified yet — check your inbox for a verification email.'}
                </div>
              )}
              {/* Verification state is stated in text, never colour alone (§4.2). */}
              {account?.email && (
                <span className={`badge mt-2 ${account.emailVerified ? 'text-bg-success' : 'text-bg-warning'}`}>
                  {account.emailVerified ? 'Email verified' : 'Email not verified'}
                </span>
              )}
            </div>
          </div>

          <div className="card-footer d-flex align-items-center gap-2">
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !dirty}>
              {saving && <span className="spinner-border spinner-border-sm me-1" />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => { setForm(account ? toForm(account) : EMPTY_FORM); setFieldErrors({}); setSaveError(null) }}
              disabled={saving || !dirty}
            >
              Discard
            </button>
            {/* §14.2: explain a disabled control when the reason is not obvious. */}
            {!dirty && !saving && (
              <span className="form-text mb-0">No changes to save.</span>
            )}
          </div>
        </form>
      </div>

      {/* §13.4 secondary column: related actions this page intentionally
          delegates to Keycloak. */}
      <div className="col-12 col-lg-4">
        <div className="card">
          <div className="card-header">Security</div>
          <div className="card-body">
            <p className="form-text">
              Password, two-factor authentication, active sessions and linked accounts are
              managed in the Keycloak account console.
            </p>
            <a
              className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
              href={accountConsoleUrl()}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open account console
              <FiExternalLink aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
