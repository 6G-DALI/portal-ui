import { useEffect, useRef, useState } from 'react'
import { FiCpu, FiDatabase, FiGitBranch, FiLayers } from 'react-icons/fi'
import type { IconType } from 'react-icons'
import { fetchPortalStats, type PortalStats, type StatsSource } from '../../lib/stats'

/**
 * The four headline counts — the scale claim the landing page is making, so
 * they are the panel's second-loudest element after the title.
 *
 * Renders skeletons rather than zeros while loading: a real 0 and "not known
 * yet" must not look alike (§20). When the figures are placeholders, that is
 * stated in text under the band — §2.3 rules out numbers that imply a
 * measurement nobody took.
 */

interface StatSpec {
  key: keyof PortalStats
  label: string
  icon: IconType
}

const STATS: StatSpec[] = [
  { key: 'datasets', label: 'Datasets', icon: FiDatabase },
  { key: 'catalogues', label: 'Catalogues', icon: FiLayers },
  { key: 'pipelines', label: 'DataOps pipelines', icon: FiGitBranch },
  { key: 'models', label: 'MLOps models', icon: FiCpu },
]

const COUNT_UP_MS = 900

/** Ease-out cubic: fast off the mark, settling gently onto the final value. */
function easeOut(t: number): number {
  return 1 - (1 - t) ** 3
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * Counts from zero to `target` once, on arrival.
 *
 * §8 limits animation to opacity and transform for performance — that rule is
 * about compositing, and this drives text content, so it is deliberately short,
 * runs once, and is skipped entirely under prefers-reduced-motion (§8.3).
 */
function useCountUp(target: number | null): number | null {
  const [value, setValue] = useState<number | null>(null)
  const frame = useRef<number>(0)

  useEffect(() => {
    if (target === null) return

    if (prefersReducedMotion()) {
      setValue(target)
      return
    }

    // performance.now() rather than Date.now(): monotonic, so a clock
    // adjustment mid-animation cannot make the progress term jump or reverse.
    const start = performance.now()

    const step = (now: number) => {
      const progress = Math.min((now - start) / COUNT_UP_MS, 1)
      setValue(Math.round(easeOut(progress) * target))
      if (progress < 1) frame.current = requestAnimationFrame(step)
    }

    frame.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame.current)
  }, [target])

  return value
}

interface StatProps {
  spec: StatSpec
  value: number | null
}

function Stat({ spec: { label, icon: Icon }, value }: StatProps) {
  const shown = useCountUp(value)

  return (
    <div className="landing-stat">
      <dt className="landing-stat-label">
        <span className="landing-stat-icon" aria-hidden="true"><Icon /></span>
        {label}
      </dt>
      <dd className="landing-stat-value">
        {shown === null
          ? <span className="skeleton landing-stat-skeleton" aria-label="Loading" />
          : shown.toLocaleString()}
      </dd>
    </div>
  )
}

export default function StatsBand() {
  const [stats, setStats] = useState<PortalStats | null>(null)
  const [source, setSource] = useState<StatsSource>('placeholder')

  useEffect(() => {
    // Abort on unmount so a slow endpoint cannot setState after teardown —
    // the landing page unmounts as soon as sign-in resolves.
    const controller = new AbortController()

    fetchPortalStats(controller.signal).then(result => {
      if (controller.signal.aborted) return
      setStats(result.stats)
      setSource(result.source)
    })

    return () => controller.abort()
  }, [])

  return (
    <div className="landing-stats-block">
      <dl className="landing-stats">
        {STATS.map(spec => (
          <Stat key={spec.key} spec={spec} value={stats ? stats[spec.key] : null} />
        ))}
      </dl>

      {stats && source === 'placeholder' && (
        <p className="landing-stats-note">
          Indicative figures — live counts are not published yet.
        </p>
      )}
    </div>
  )
}
