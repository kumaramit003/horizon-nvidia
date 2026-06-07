// Resolve an LLM-produced dataset reference (slug or name) to a REAL London
// Datastore URL. The model invents slugs like "workplace-zone-statistics"
// that don't exist on data.london.gov.uk, so we map known references to
// verified URLs and fall back to the site's free-text search (?q=) — which
// always lands on relevant real datasets and never 404s.

const SEARCH = (q) => `https://data.london.gov.uk/dataset/?q=${encodeURIComponent(q)}`

// Each entry: substrings to match (against slug + name), the display name,
// and either a verified deep `url` or a `q` search term.
const CATALOG = [
  { match: ['workplace-zone', 'workplace zone', 'employment density', 'jobs density', 'daytime population'],
    name: 'Workplace Zone Classification', url: 'https://data.london.gov.uk/census/lwzc/' },
  { match: ['business-demography', 'business demography', 'business birth', 'business survival', 'business death'],
    name: 'London Business Demography', url: 'https://data.london.gov.uk/dataset/london-business-demography-report/' },
  { match: ['labour-market', 'labour market', 'skills'],
    name: 'London Labour Market Indicators', url: 'https://data.london.gov.uk/dataset/london-labour-market-indicators/' },
  { match: ['lsoa', 'atlas'],
    name: 'LSOA Atlas', url: 'https://data.london.gov.uk/dataset/lsoa-atlas/' },
  { match: ['census', 'religion', 'ethnicity', 'population', 'demograph'],
    name: '2021 Census (London)', q: 'census 2021' },
  { match: ['high-street', 'high street', 'footfall', 'town centre'],
    name: 'High Streets data', q: 'high streets' },
  { match: ['tfl', 'transport', 'station', 'tube', 'underground', 'rail'],
    name: 'Transport / TfL data', q: 'transport stations' },
  { match: ['borough-profile', 'borough profile', 'borough'],
    name: 'London Borough Profiles', q: 'borough profiles' },
  { match: ['voa', 'floorspace', 'floor space', 'rateable', 'rent', 'commercial property'],
    name: 'Floorspace & Property', q: 'floorspace business' },
  { match: ['funding', 'grant', 'support scheme', 'gla-funding', 'enterprise'],
    name: 'Business support & funding', q: 'business support funding' },
  { match: ['food', 'hygiene', 'restaurant', 'fsa', 'catering'],
    name: 'Food business data', q: 'food businesses' },
  { match: ['survey-of-londoner', 'survey of londoner'],
    name: 'Survey of Londoners', q: 'survey of londoners' },
  { match: ['planning', 'planning-application'],
    name: 'Planning Applications', q: 'planning applications' },
  { match: ['air-quality', 'air quality', 'pollution', 'emissions'],
    name: 'London Air Quality', q: 'air quality' },
  { match: ['crime', 'safety', 'police'],
    name: 'Crime & Community Safety', q: 'crime' },
  { match: ['tourism', 'visitor', 'hotel'],
    name: 'Tourism & Visitors', q: 'tourism' },
  { match: ['house price', 'housing', 'rent affordab'],
    name: 'Housing & Rents', q: 'housing rents' },
]

function urlFor(entry) {
  return entry.url || SEARCH(entry.q || entry.name)
}

// Resolve to { name, url }. `nameOrSlug` may be the LLM slug, the display
// name, or both (we test against the combined string).
export function resolveDataset(nameOrSlug, fallbackName) {
  const raw = `${nameOrSlug || ''} ${fallbackName || ''}`.toLowerCase()
  if (!raw.trim()) {
    return { name: 'London Datastore', url: 'https://data.london.gov.uk/dataset/' }
  }
  for (const entry of CATALOG) {
    if (entry.match.some((m) => raw.includes(m))) {
      return { name: fallbackName || entry.name, url: urlFor(entry) }
    }
  }
  // Unknown reference → search the datastore by whatever name we have.
  const label = (fallbackName || nameOrSlug || '').toString()
  return { name: label || 'London Datastore', url: SEARCH(label || 'datasets') }
}
