import { FiArrowUpRight, FiLock } from 'react-icons/fi'
import type { Service } from '../../lib/services'

/**
 * One service in the portal grid.
 *
 * An available service renders as a real anchor (keyboard operable, opens in a
 * new tab, middle-clickable). Internal and planned services render as a
 * non-interactive card with the reason stated in text — never a dead link, and
 * never state communicated by colour alone (§4.2).
 */

const AVAILABILITY_LABEL: Record<Service['availability'], string> = {
  available: 'Available',
  internal: 'Internal only',
  planned: 'Planned',
}

interface ServiceCardProps {
  service: Service
}

export default function ServiceCard({ service }: ServiceCardProps) {
  const { name, description, url, icon: Icon, tag, availability, note } = service
  const linked = availability === 'available' && Boolean(url)

  const body = (
    <>
      <div className="service-card-head">
        <span className="service-card-icon" aria-hidden="true">
          <Icon />
        </span>
        <span className="service-card-name">{name}</span>
        <span className="service-card-tag">{tag}</span>
      </div>

      <p className="service-card-description">{description}</p>

      <div className="service-card-foot">
        <span className={`availability availability-${availability}`}>
          {availability === 'internal' && <FiLock aria-hidden="true" />}
          {AVAILABILITY_LABEL[availability]}
        </span>
        {linked ? (
          <span className="service-card-host" title={url}>
            {hostOf(url)}
            <FiArrowUpRight aria-hidden="true" />
          </span>
        ) : (
          note && <span className="service-card-note">{note}</span>
        )}
      </div>
    </>
  )

  if (!linked) {
    return (
      <div className="service-card service-card-inert">
        {body}
      </div>
    )
  }

  return (
    <a
      className="service-card service-card-linked"
      href={url}
      target="_blank"
      rel="noreferrer noopener"
    >
      {body}
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  )
}

/** Show the host rather than the full URL — the full value stays in the title. */
function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
