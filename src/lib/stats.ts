import { config } from '../config'

/**
 * Landing-page counts for the data ecosystem.
 *
 * These are PLACEHOLDER figures until a stats endpoint exists. §2.3 forbids
 * decoration that communicates nothing real, so the numbers are never presented
 * as measured: `source` travels with them and the UI labels placeholder data
 * explicitly rather than letting a visitor read invented counts as fact.
 *
 * Switching to the real thing is configuration, not code: set VITE_STATS_API_URL
 * (or statsApiUrl in config.js) to an endpoint returning the JSON below, and
 * `source` flips to 'live' on its own.
 *
 *   { "datasets": 128, "catalogues": 6, "pipelines": 24, "models": 9 }
 */

export interface PortalStats {
  /** Dataset records in the federated catalogue. */
  datasets: number
  /** Catalogues federated into the data space. */
  catalogues: number
  /** DataOps pipelines defined across all catalogues. */
  pipelines: number
  /** MLOps models published against catalogue datasets. */
  models: number
}

export type StatsSource = 'live' | 'placeholder'

export interface StatsResult {
  stats: PortalStats
  source: StatsSource
}

/** Stand-in values, deliberately modest — a fake 10,000 would misrepresent the
 *  deployment far more than a fake 128 does. Delete once the API is live. */
const PLACEHOLDER_STATS: PortalStats = {
  datasets: 128,
  catalogues: 6,
  pipelines: 24,
  models: 9,
}

function isPortalStats(value: unknown): value is PortalStats {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (['datasets', 'catalogues', 'pipelines', 'models'] as const)
    .every(key => typeof v[key] === 'number' && Number.isFinite(v[key]))
}

/**
 * Never rejects: the landing page is the pre-authentication view, and a stats
 * endpoint being down is not a reason to fail the way in. A failed or malformed
 * response degrades to the placeholders, which are already labelled as such.
 */
export async function fetchPortalStats(signal?: AbortSignal): Promise<StatsResult> {
  if (!config.statsApiUrl) return { stats: PLACEHOLDER_STATS, source: 'placeholder' }

  try {
    const response = await fetch(config.statsApiUrl, { signal })
    if (!response.ok) return { stats: PLACEHOLDER_STATS, source: 'placeholder' }

    const body: unknown = await response.json()
    if (!isPortalStats(body)) return { stats: PLACEHOLDER_STATS, source: 'placeholder' }

    return { stats: body, source: 'live' }
  } catch {
    return { stats: PLACEHOLDER_STATS, source: 'placeholder' }
  }
}
