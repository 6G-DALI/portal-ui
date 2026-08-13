import type { IconType } from 'react-icons'
import {
  FiActivity,
  FiBookOpen,
  FiCpu,
  FiDatabase,
  FiFileText,
  FiGitBranch,
  FiGlobe,
  FiShield,
} from 'react-icons/fi'
import { config } from '../config'

/**
 * The service registry — the portal's entire content model.
 *
 * Only user-facing applications belong here. The APIs behind them (repository,
 * search, SPARQL, the DataOps orchestrator) and the identity provider are
 * infrastructure: nobody navigates to them from a portal, so listing them added
 * cards a user can do nothing with.
 *
 * `availability` is declared, not probed. Nothing here polls a health
 * endpoint, so the portal must not imply live status it cannot verify (§2.3
 * forbids decoration that communicates nothing real):
 *
 *   'available' — a URL is configured and reachable from a browser
 *   'internal'  — the service exists but is bound to loopback on the server
 *                 and is not reachable from a user's browser
 *   'planned'   — not deployed yet; rendered without a link
 *
 * A service whose configured URL is empty degrades to 'planned' automatically,
 * so an unconfigured deployment shows an honest gap instead of a dead link.
 */

export type Availability = 'available' | 'internal' | 'planned'

export interface Service {
  id: string
  name: string
  description: string
  url: string
  icon: IconType
  /** Short technical tag — one of the few places uppercase is allowed (§5.3). */
  tag: string
  availability: Availability
  /** Shown for 'internal' and 'planned' so the state is explained, not just coloured. */
  note?: string
}

export interface ServiceGroup {
  id: string
  title: string
  description: string
  services: Service[]
}

function availabilityOf(url: string, declared: Availability = 'available'): Availability {
  if (declared === 'planned') return 'planned'
  if (!url) return 'planned'
  return declared
}

export const SERVICE_GROUPS: ServiceGroup[] = [
  {
    id: 'dataspace',
    title: 'Data space',
    description: 'Catalogue and APIs for datasets, data services and ML models.',
    services: [
      {
        id: 'catalogue',
        name: 'Catalogue',
        description:
          'Browse and search the federated catalogue of testbed datasets, data services and ML models.',
        url: config.dataspaceUrl,
        icon: FiDatabase,
        tag: 'DCAT-AP',
        availability: availabilityOf(config.dataspaceUrl),
      },
    ],
  },
  {
    id: 'pipelines',
    title: 'Pipelines',
    description: 'Data and model pipelines that produce and enrich catalogue records.',
    services: [
      {
        id: 'dataops',
        name: 'DataOps',
        description:
          'Author and monitor Airflow pipelines, register datasets, and run Great Expectations quality checks.',
        url: config.dataopsUrl,
        icon: FiGitBranch,
        tag: 'AIRFLOW',
        availability: availabilityOf(config.dataopsUrl),
      },
      {
        id: 'mlops',
        name: 'MLOps',
        description:
          'Train, evaluate and publish ML models against catalogue datasets, with metrics recorded as DQV measurements.',
        url: config.mlopsUrl,
        icon: FiCpu,
        tag: 'MLDCAT-AP',
        availability: 'planned',
        note: 'Not deployed yet.',
      },
    ],
  },
  {
    id: 'interop',
    title: 'Interoperability',
    description: 'Interfaces to testbeds, external data spaces and research infrastructures.',
    services: [
      {
        id: 'northbound',
        name: 'Northbound API',
        description:
          'Testbed-facing ingestion interface for pushing measurement datasets and metadata into the data space.',
        url: config.northboundApiUrl,
        icon: FiActivity,
        tag: 'OPENAPI',
        availability: availabilityOf(config.northboundApiUrl),
      },
      {
        id: 'edc',
        name: 'EDC Connector',
        description:
          'Eclipse Dataspace Components connector for sovereign, contract-governed data exchange with other data spaces.',
        url: config.edcConnectorUrl,
        icon: FiShield,
        tag: 'GAIA-X',
        availability: availabilityOf(config.edcConnectorUrl),
      },
    ],
  },
]

export interface DocLink {
  id: string
  name: string
  description: string
  url: string
  icon: IconType
  external: boolean
}

export const DOCUMENTATION: DocLink[] = [
  {
    id: 'map',
    name: 'Metadata Application Profile',
    description:
      'The 6G-DALI metadata profile: DCAT-AP 3.0 with GAIA-X, SNS-JU CMT, DQV and MLDCAT-AP extensions, plus the SHACL shapes.',
    url: 'https://github.com/6g-dali',
    icon: FiBookOpen,
    external: true,
  },
  {
    id: 'gui',
    name: 'GUI guidelines',
    description:
      'Visual language, component specifications and frontend conventions shared by every DALI interface.',
    url: 'https://github.com/6g-dali',
    icon: FiFileText,
    external: true,
  },
  {
    id: 'dcat-ap',
    name: 'DCAT-AP 3.0',
    description: 'The EU application profile of W3C DCAT that all catalogue records conform to.',
    url: 'https://semiceu.github.io/DCAT-AP/releases/3.0.0/',
    icon: FiFileText,
    external: true,
  },
  {
    id: 'mldcat-ap',
    name: 'MLDCAT-AP',
    description: 'Application profile describing machine-learning models and their training datasets.',
    url: 'https://semiceu.github.io/MLDCAT-AP/releases/2.0.0/',
    icon: FiFileText,
    external: true,
  },
  {
    id: 'gaia-x',
    name: 'GAIA-X Trust Framework',
    description: 'Policy rules and self-description requirements for European data space interoperability.',
    url: 'https://gaia-x.eu/policy-rules-committee/trust-framework/',
    icon: FiShield,
    external: true,
  },
  {
    id: 'project',
    name: '6G-DALI project',
    description: 'Project website: objectives, consortium, publications and public deliverables.',
    url: config.daliUrl,
    icon: FiGlobe,
    external: true,
  },
]
