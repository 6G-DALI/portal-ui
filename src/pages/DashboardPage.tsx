import { FiArrowUpRight } from 'react-icons/fi'
import ServiceCard from '../components/domain/ServiceCard'
import { DOCUMENTATION, SERVICE_GROUPS } from '../lib/services'

/**
 * Portal overview — a directory of every DALI service and the specifications
 * behind them, laid out on the same Bootstrap grid and card treatment as
 * dataops-ui so the two applications read as one product.
 *
 * Deliberately not a metrics dashboard: §13.2's metric cards and activity feeds
 * need live data, and this page has no backend. Fake counters or status lights
 * would be decoration that communicates nothing (§2.3). If health data becomes
 * available, the natural addition is a probe per service feeding the existing
 * `availability` field.
 */

export default function DashboardPage() {
  const services = SERVICE_GROUPS.flatMap(group => group.services)
  const available = services.filter(s => s.availability === 'available').length
  const planned = services.filter(s => s.availability === 'planned').length

  return (
    <div>
      <p className="page-subtitle">
        Every interface, API and specification in the 6G-DALI data ecosystem, in one place.
        You are signed in to the shared 6G-DALI single sign-on environment, so these services
        will not ask you to log in again. {available} of {services.length} services are reachable
        {planned > 0 && `, ${planned} not yet deployed`}.
      </p>

      {SERVICE_GROUPS.map(group => (
        <section className="mb-4" key={group.id} aria-labelledby={`group-${group.id}`}>
          <div className="mb-3 pb-2 border-bottom">
            <h2 className="portal-section-title" id={`group-${group.id}`}>{group.title}</h2>
            <p className="portal-section-description mb-0">{group.description}</p>
          </div>
          <div className="row g-3">
            {group.services.map(service => (
              <div className="col-12 col-md-6 col-xl-4" key={service.id}>
                <ServiceCard service={service} />
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="mb-4" aria-labelledby="group-docs">
        <div className="mb-3 pb-2 border-bottom">
          <h2 className="portal-section-title" id="group-docs">Documentation</h2>
          <p className="portal-section-description mb-0">
            The profiles and specifications every DALI service conforms to.
          </p>
        </div>
        <div className="row g-2">
          {DOCUMENTATION.map(doc => {
            const Icon = doc.icon
            return (
              <div className="col-12 col-md-6" key={doc.id}>
                <a
                  className="doc-item"
                  href={doc.url}
                  target={doc.external ? '_blank' : undefined}
                  rel={doc.external ? 'noreferrer noopener' : undefined}
                >
                  <span className="doc-icon" aria-hidden="true"><Icon /></span>
                  <span>
                    <span className="doc-name">
                      {doc.name}
                      {doc.external && <FiArrowUpRight aria-hidden="true" />}
                    </span>
                    <span className="doc-description">{doc.description}</span>
                  </span>
                </a>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
