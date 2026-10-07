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
 *   { "datasets": 128, "catalogues": 6, "pipelines": 24, "models": null }
 *
 * The orchestrator serves exactly this at GET /stats/portal. A null figure is left out of the band.
 */

export interface PortalStats {
  /** Dataset records in the federated catalogue. null = not known, so not shown. */
  datasets: number | null
  /** Catalogues federated into the data space. */
  catalogues: number | null
  /** DataOps pipelines defined across all catalogues. */
  pipelines: number | null
  /** MLOps models published against catalogue datasets. */
  models: number | null
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

const STAT_KEYS = ['datasets', 'catalogues', 'pipelines', 'models'] as const

/**
 * A usable response has at least one real count. A missing or null figure means the API could
 * not determine it (the orchestrator reports null for a source it cannot reach): it is left
 * out rather than shown as 0, which would claim a measurement nobody took.
 */
function parsePortalStats(value: unknown): PortalStats | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const count = (key: string): number | null =>
    typeof v[key] === 'number' && Number.isFinite(v[key]) ? (v[key] as number) : null

  const stats = Object.fromEntries(STAT_KEYS.map(key => [key, count(key)])) as unknown as PortalStats
  return STAT_KEYS.some(key => stats[key] !== null) ? stats : null
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

    const stats = parsePortalStats(await response.json())
    if (!stats) return { stats: PLACEHOLDER_STATS, source: 'placeholder' }

    return { stats, source: 'live' }
  } catch {
    return { stats: PLACEHOLDER_STATS, source: 'placeholder' }
  }
}
