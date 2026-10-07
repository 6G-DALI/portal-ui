import { useEffect, useRef, useState } from 'react'
import { FiCpu, FiDatabase, FiGitBranch, FiLayers } from 'react-icons/fi'
import type { IconType } from 'react-icons'
import { fetchPortalStats, type PortalStats } from '../../lib/stats'

/**
 * The four headline counts — the scale claim the landing page is making, so
 * they are the panel's second-loudest element after the title.
 *
 * Renders skeletons rather than zeros while loading: a real 0 and "not known
 * yet" must not look alike (§20). If the figures turn out to be unavailable,
 * the band is not rendered at all — §2.3 rules out numbers that imply a
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
  // undefined: still loading. null: the API gave nothing usable.
  const [stats, setStats] = useState<PortalStats | null | undefined>(undefined)

  useEffect(() => {
    // Abort on unmount so a slow endpoint cannot setState after teardown —
    // the landing page unmounts as soon as sign-in resolves.
    const controller = new AbortController()

    fetchPortalStats(controller.signal).then(result => {
      if (controller.signal.aborted) return
      setStats(result)
    })

    return () => controller.abort()
  }, [])

  // No figures to show: leave the band out entirely rather than render an empty frame.
  if (stats === null) return null

  return (
    <div className="landing-stats-block">
      <dl className="landing-stats">
        {STATS
          // While loading `stats` is undefined and every tile shows its skeleton. Once it is
          // loaded, a figure that is null is unknown: leave the tile out, not a 0.
          .filter(spec => !stats || stats[spec.key] !== null)
          .map(spec => (
            <Stat key={spec.key} spec={spec} value={stats ? stats[spec.key] : null} />
          ))}
      </dl>
    </div>
  )
}
