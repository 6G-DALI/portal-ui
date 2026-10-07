import { config } from '../config'

/**
 * Landing-page counts for the data ecosystem, from the orchestrator's GET /stats/portal.
 *
 * Only real figures are ever shown. When the endpoint is not configured, cannot be reached, or
 * answers with nothing usable, there are no figures at all and the page leaves the band out:
 * §2.3 forbids decoration that communicates nothing real, and an invented number would be worse
 * than none.
 *
 * Wiring it up is configuration, not code: set VITE_STATS_API_URL (or statsApiUrl in config.js)
 * to an endpoint returning the JSON below.
 *
 *   { "datasets": 128, "catalogues": 6, "pipelines": 24, "models": null }
 *
 * A null figure means the API could not determine it; that one tile is left out of the band.
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

const STAT_KEYS = ['datasets', 'catalogues', 'pipelines', 'models'] as const

/**
 * A usable response has at least one real count. A missing or null figure means the API
 * could not determine it: it is left out rather than shown as 0, which would claim a
 * measurement nobody took.
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
 * The counts, or null when they are unavailable for any reason.
 *
 * Never rejects: the landing page is the pre-authentication view, and a stats endpoint being
 * down is not a reason to fail the way in.
 */
export async function fetchPortalStats(signal?: AbortSignal): Promise<PortalStats | null> {
  if (!config.statsApiUrl) return null

  try {
    const response = await fetch(config.statsApiUrl, { signal })
    if (!response.ok) return null
    return parsePortalStats(await response.json())
  } catch {
    return null
  }
}
