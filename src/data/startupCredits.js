// Curated cloud & infra credits for tech startups.
// Full catalogue: https://github.com/dakshshah96/awesome-startup-credits

const TECH_PATTERN = /\b(tech|software|saas|app|platform|digital|api|ai|ml|web|mobile|fintech|edtech|devtools|cloud|marketplace|dating|marketplace|b2b|b2c|startup)\b/i

export function isTechStartup(dashboard) {
  const idea = dashboard?.idea || {}
  const blob = [
    idea.business_type,
    idea.title,
    idea.subtitle,
    idea.description,
    idea.revenue,
    idea.stage,
    idea.physical_site,
  ].filter(Boolean).join(' ')
  return TECH_PATTERN.test(blob)
}

export const STARTUP_CREDIT_PROGRAMS = [
  {
    name: 'AWS Activate',
    provider: 'Amazon Web Services',
    benefit: 'AWS credits, technical support & training for eligible startups.',
    url: 'https://aws.amazon.com/activate/',
    category: 'Cloud',
    tone: 'peach',
  },
  {
    name: 'Google Cloud for Startups',
    provider: 'Google Cloud',
    benefit: 'Cloud credits, community events & training as you scale.',
    url: 'https://cloud.google.com/startup',
    category: 'Cloud',
    tone: 'sky',
  },
  {
    name: 'Microsoft for Startups',
    provider: 'Microsoft',
    benefit: 'Free Azure cloud, technical resources & go-to-market support.',
    url: 'https://www.microsoft.com/en-us/startups',
    category: 'Cloud',
    tone: 'mint',
  },
  {
    name: 'Hatch by DigitalOcean',
    provider: 'DigitalOcean',
    benefit: '12 months of infrastructure credit plus startup perks.',
    url: 'https://www.digitalocean.com/hatch',
    category: 'Cloud',
    tone: 'lavender',
  },
  {
    name: 'MongoDB for Startups',
    provider: 'MongoDB',
    benefit: 'Up to $3,000 in Atlas credits plus technical advisory.',
    url: 'https://www.mongodb.com/startups',
    category: 'Database',
    tone: 'butter',
  },
  {
    name: 'Startup with IBM',
    provider: 'IBM Cloud',
    benefit: 'Up to $120,000 in IBM Cloud credits for early-stage teams.',
    url: 'https://www.ibm.com/cloud/startups',
    category: 'Cloud',
    tone: 'rose',
  },
]

export const STARTUP_CREDITS_CATALOGUE = 'https://github.com/dakshshah96/awesome-startup-credits'
