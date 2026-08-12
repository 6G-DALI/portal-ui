import keycloak from '../auth/keycloak'
import { config } from '../config'

/**
 * Client for the Keycloak Account REST API
 * (`/realms/{realm}/account`), used to let a signed-in user edit their own
 * profile without leaving the portal.
 *
 * Two Keycloak-side prerequisites, both easy to miss because the symptom is a
 * bare 401/403 rather than anything descriptive:
 *
 *  1. The access token must carry `account` in its audience. A token minted for
 *     the `dali-portal` client does not by default — add a dedicated Audience
 *     mapper to the client (Client scopes → dali-portal-dedicated → Add mapper
 *     → By configuration → Audience → Included client audience: `account`).
 *  2. The user needs the `account` client roles `view-profile` and
 *     `manage-account`, normally granted through the realm's
 *     `default-roles-<realm>` composite.
 *
 * `readError` below turns those into an actionable message instead of "failed".
 */

const BASE = `${config.authUrl}/realms/${config.keycloakRealm}/account`

export interface AccountAttributeMetadata {
  name: string
  displayName?: string
  required?: boolean
  readOnly?: boolean
}

export interface UserProfileMetadata {
  attributes?: AccountAttributeMetadata[]
}

/** Subset of Keycloak's UserRepresentation exposed by the account endpoint. */
export interface Account {
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  emailVerified?: boolean
  userProfileMetadata?: UserProfileMetadata
}

/** The fields this page allows editing. */
export type AccountPatch = Pick<Account, 'firstName' | 'lastName' | 'email'>

export class AccountApiError extends Error {
  readonly status: number
  /** Per-field validation messages, keyed by field name (§15.2). */
  readonly fieldErrors: Record<string, string>

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'AccountApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

/** Refresh the token if it is close to expiry, then return the bearer header. */
async function authHeader(): Promise<Record<string, string>> {
  try {
    await keycloak.updateToken(30)
  } catch {
    // Silent refresh failed (e.g. the SSO session ended). The request below
    // will 401 and surface as an error the user can act on.
  }
  return keycloak.token ? { Authorization: `Bearer ${keycloak.token}` } : {}
}

/**
 * Keycloak reports validation problems in more than one shape:
 *   [{ "field": "email", "errorMessage": "error-invalid-email" }]
 *   { "errorMessage": "..." } | { "error": "..." }
 */
async function readError(response: Response): Promise<AccountApiError> {
  if (response.status === 401 || response.status === 403) {
    return new AccountApiError(
      'Keycloak rejected the request. The access token most likely lacks the '
      + '`account` audience, or this user does not hold the `manage-account` role.',
      response.status,
    )
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return new AccountApiError(`Keycloak returned ${response.status}.`, response.status)
  }

  if (Array.isArray(payload)) {
    const fieldErrors: Record<string, string> = {}
    for (const item of payload as Array<{ field?: string; errorMessage?: string }>) {
      if (item.field) fieldErrors[item.field] = humanise(item.errorMessage)
    }
    const summary = Object.keys(fieldErrors).length
      ? 'Some fields could not be saved.'
      : `Keycloak returned ${response.status}.`
    return new AccountApiError(summary, response.status, fieldErrors)
  }

  const obj = payload as { errorMessage?: string; error?: string }
  return new AccountApiError(
    humanise(obj.errorMessage ?? obj.error) || `Keycloak returned ${response.status}.`,
    response.status,
  )
}

/** Keycloak returns message *keys*; translate the common profile ones. */
const MESSAGE_KEYS: Record<string, string> = {
  'error-invalid-email': 'Enter a valid email address.',
  'error-invalid-blank': 'This field is required.',
  'error-user-attribute-required': 'This field is required.',
  'error-email-exists': 'That email address is already in use.',
  'error-username-exists': 'That username is already taken.',
  'error-user-attribute-read-only': 'This field cannot be changed here.',
  'readOnlyUsernameMessage': 'The username cannot be changed.',
}

function humanise(key: string | undefined): string {
  if (!key) return ''
  return MESSAGE_KEYS[key] ?? key
}

export async function getAccount(): Promise<Account> {
  const response = await fetch(`${BASE}/`, {
    headers: { Accept: 'application/json', ...(await authHeader()) },
  })
  if (!response.ok) throw await readError(response)
  return response.json() as Promise<Account>
}

/**
 * Updates the profile. Keycloak's account endpoint uses POST on the collection
 * root for updates (not PUT) and replaces the representation, so the caller
 * must send the full set of editable fields, not a sparse patch.
 */
export async function updateAccount(patch: AccountPatch): Promise<void> {
  const response = await fetch(`${BASE}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(await authHeader()),
    },
    body: JSON.stringify(patch),
  })
  if (!response.ok) throw await readError(response)
}

/** Deep link into Keycloak's own account console, for everything this page
 *  deliberately does not implement: password, 2FA, sessions, linked accounts. */
export function accountConsoleUrl(): string {
  return `${config.authUrl}/realms/${config.keycloakRealm}/account/`
}

/** Looks up per-attribute metadata so the form can honour the realm's user
 *  profile configuration instead of assuming every field is writable. */
export function attributeMeta(
  account: Account | null,
  name: string,
): AccountAttributeMetadata | undefined {
  return account?.userProfileMetadata?.attributes?.find(attr => attr.name === name)
}
