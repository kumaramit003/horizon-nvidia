# Finn & Flora — Idea & Project Context

> A voice-first, agentic startup advisor for early-stage London founders.
> Built for the Hackathon **Economic Systems** track: helping individuals
> and small businesses make better economic decisions, unlock opportunities,
> and optimise costs.

**Live:** https://khiz-dev.github.io/horizon/
**Repo:** https://github.com/khiz-dev/horizon (deployed via GitHub Pages, base path `/horizon/`)
**Local dev:** `npm install && npm run dev`

---

## 1. The product in one sentence

A founder speaks their rough idea out loud. **Flora** (Discovery Agent) interviews them
conversationally and builds an Idea Profile. **Finn** (Research & Planning Agent) then
reads the London Datastore on their behalf and turns the profile into a real, dataset-
backed launch plan. The founder sees the plan, refines it with voice, ships it.

**Tagline:** *Flora discovers. Finn plans. You launch.*

---

## 2. The two agents

The product is anchored around two named AI personalities. Together they're the
"Finn & Flora" brand. Originally these roles were swapped during build — they
were corrected so Flora (warm, feminine) does the human discovery and Finn
(grounded, analytical) does the cold research.

### Flora — Discovery Agent
- **Personality:** warm, conversational, patient, gently challenging
- **Responsibility:** runs the voice intake, asks deeper questions to extract
  the founder's idea, surfaces and challenges weak assumptions, builds the
  Idea Profile and founder clarity score
- **Visual identity:** peach + lavender on coral gradient orb
  (`gradient-orb-flora` in `index.css`)
- **Owns dashboard section:** *The idea*

### Finn — Research & Planning Agent
- **Personality:** grounded, analytical, doesn't sugarcoat
- **Responsibility:** reads public London datasets, validates the idea,
  finds and ranks the target audience, compares locations, surfaces relevant
  grants and support schemes, estimates financial assumptions, writes the
  7-day and 30/60/90-day launch plan
- **Visual identity:** deep forest + sage gradient orb (`gradient-orb-finn`)
- **Owns dashboard sections:** *Who buys, Worth doing?, Where, Money & grants,
  Your next 7 days*

### Voice routing
The founder can address either agent by name at any time:
- *"Flora, challenge my riskiest assumption"* → Flora returns to discovery
- *"Finn, find grants"* → Finn triggers funding analysis
- *"Finn, compare with Canary Wharf"* → Finn updates Locations
- Generic prompts get routed automatically

Voice commands **mutate structured dashboard data** — they don't just produce
chat replies. The UI shows which sections updated.

---

## 3. User flow

There are two screens — Intake then Dashboard.

### Screen 1 · Intake (voice-first onboarding)
- Single-column, centered, minimal chrome
- Large pulsing gradient orb (Flora's warm palette during conversation)
- Live transcript appears one message at a time as editorial display type
- Rotating motivational copy above the orb
- Progress dots track conversation completion (e.g. "62% Idea profile building")
- All "info, signals, profile draft" is hidden during conversation — the founder
  just talks; the system listens
- At the end: orb shifts to Finn's forest palette and a sequenced "Reading London
  for you" panel cycles through the actual datasets being queried
- Calm hero state: *"Your plan is ready."* → primary button *See my plan*

### Screen 2 · Dashboard (the plan)
Sidebar nav over a main content area. Seven sections:

1. **The idea** *(Flora)* — Hero with idea summary, founder clarity score (78/100),
   Flora's read on the idea as a quote, clarity breakdown across 7 dimensions,
   assumption cards (Accept/Edit/Challenge), open questions to push clarity to 90%
2. **Who buys** *(Finn)* — 4 ranked audience segments, 2 persona cards (Aysha the
   busy finance professional, Omar the office manager), suggested interview script
3. **Worth doing?** *(Finn)* — Validation verdict, evidence cards with dataset
   sources, 7-axis risk radar, recommended first wedge, ranked experiments
4. **Where** *(Finn)* — Stylised London map with layer toggles (customer density,
   competitor clusters, transport hubs, opportunity zones), comparison table
   across Liverpool Street, Canary Wharf, Whitechapel, Stratford, top-pick card
5. **Money & grants** *(Finn)* — 4 startup cost bands (£1k–£150k+), editable
   monthly assumptions table with footer burn calc, funding readiness score
   (54%), 4 grant cards from the GLA Funding Directory with fit scores
6. **Your next 7 days** *(Finn)* — Day-by-day 7-day sprint timeline, 30/60/90
   day roadmap, 8 generated assets (interview script, landing copy, outreach
   email, grant draft, etc.), priority task checklist
7. **Flora & Finn** *(both)* — Workspace view: both agents' status, modules,
   activity timeline, the 12-dataset London Datastore library (filterable),
   "beyond Datastore" tools, confidence & assumptions log

A floating voice button in the bottom-right is available on every page.
Clicking it opens a modal that shows: live waveform, transcript, agent response,
and a panel of dashboard sections being updated in real time.

---

## 4. London Datastore — the intelligence layer

**Core ask from the user:** *"The idea is to use this website as much as
possible to build up the intelligence system — https://data.london.gov.uk/dataset/"*

This is the unique edge of the product. Every recommendation Finn makes is
anchored to a public dataset on data.london.gov.uk. The 12 mock-referenced
datasets indexed in `src/data/londonDatasets.js`:

| Dataset | Used for |
|---|---|
| Workplace Zone Statistics | Daytime employment density → lunch demand |
| London Business Demography | Business births/deaths/survival by borough+SIC |
| 2021 Census · Religion by Ward | Halal demand modelling |
| London Borough Profiles | Demographic & labour market baseline |
| High Streets Health Check | Footfall, vacancy rates, retail mix |
| TfL Open Data (stations & flows) | Foot traffic catchments |
| Survey of Londoners | Self-reported food & lifestyle behaviour |
| VOA Floor Space & Property | Rent exposure proxy |
| Planning Applications · GLA | New venue / change-of-use activity |
| GLA Funding & Support Directory | Active grants and accelerators |
| Food Business Establishments | Competitor density, hygiene ratings |
| London Air Quality Data | Outdoor pop-up viability |

**Where they show up in the UI:**
- **Source chips** on evidence cards in Market Validation
- **"Built from" attribution** under the London map on Locations
- **Funding & support** section attributed to GLA Funding Directory
- **Filterable dataset library** as a primary section of the Agent Workspace
- **"Powered by London Datastore" pill** in the global header
- **Sidebar footer card** linking out to data.london.gov.uk

Each dataset card is clickable and links to the real dataset slug on
data.london.gov.uk (using `https://data.london.gov.uk/dataset/<slug>`).

---

## 5. Mock founder scenario

The whole product is demonstrated through one consistent founder example:

> **"I want to open a halal healthy lunch and corporate catering business
> near Liverpool Street for office workers."**

Founder context that builds across the conversation:
- Muslim, works near Liverpool Street, can't find healthy halal lunch options
- ~£8–10k budget saved
- Wants to start as a side project, go full-time once customers exist
- Flexible on storefront vs pop-up vs delivery

The dashboard shows Finn's recommendation: don't sign a lease. Start with
B2B catering pre-orders to office managers, run pop-up tests, find 10–20
recurring corporate customers, then decide between pop-up, delivery
kitchen, or storefront at the 90-day mark.

This example was chosen because it touches every London Datastore dataset
naturally (office density → lunch demand, religion ward → halal niche,
TfL → footfall, GLA funding → grants for women / food / sustainability,
etc).

---

## 6. Design system

The visual language went through three iterations during development:
1. ~~Dark Linear-style dashboard with violet/cyan~~ (user: too generic)
2. ~~Light cream + bright coral with Instrument Serif~~ (user: better but wanted Finn & Flora rebrand)
3. **Current — warm cream + forest/sage with peach & lavender accents**

### Palette
- **Background:** cream `#F7F3EC` (with mesh of soft peach + lavender + sage radial gradients)
- **Primary text / brand:** forest green `#284228` (`forest-500`)
- **Accent:** sage `#6E8B6A` (`sage-500`)
- **Soft gradient tones:** peach, lavender, mint, sky, butter, rose — used as
  decorative blobs and category tints
- **Primary CTA:** `btn-forest` (deep green on cream)

### Typography
- **Display:** Instrument Serif (used for headlines, often with italic accents
  for emphasis — e.g. *"Your plan is **ready**."*)
- **Body & UI:** Inter
- **Mono:** JetBrains Mono (for counters, timestamps, source slugs)

### Motifs
- **Leaf glyph** — custom SVG used as logo mark and in agent orbs;
  organic, hand-drawn feel
- **Gradient orbs** — Flora's warm peach/coral, Finn's deep forest, both with
  breathing animation
- **Soft pastel gradients** — peach, lavender, mint, sky, butter, rose
  blobs on cream cards for visual category coding
- **Rounded everything** — `rounded-2xl` / `rounded-3xl` / `rounded-full`
- **Dot grid** background texture on map and intake

### Animations
- `breathe` — slow scale pulse for orbs, status dots
- `ringOut` — concentric expanding rings around the orb when listening
- `wave` — waveform bars during speech
- `floaty` — slow vertical drift for ambient gradient blobs on Intake
- `shimmer` — for running agent progress bars
- `cursor` — blinking caret in live transcript

### Inspiration
- **Send.ai** — cream warmth, generous whitespace, soft gradients
- **Jack & Jill AI** — voice-orb focal point, minimal onboarding, motivational copy
- **Linear / Notion / Arc / Raycast** — calm chrome, premium feel, clear hierarchy

---

## 7. Technical stack

- **React 18** with Vite 6
- **Tailwind CSS** with a custom palette (`forest`, `sage`, `peach`, `lavender`,
  `mint`, `sky`, `butter`, `rose`, `ink`, `cream`)
- **lucide-react** for icons
- **recharts** installed but custom SVG used for radar/map (more brand-consistent)
- No backend, no auth, no router (state-based view switching in `App.jsx`)
- All "intelligence" is mocked but structured exactly the way a real backend
  would expose it (see `src/data/londonDatasets.js`)

### Key file structure
```
src/
  App.jsx                     ← stage switch: intake | dashboard
  index.css                   ← tokens, .card, gradient-orb-flora/-finn, animations
  components/
    Brand.jsx                 ← LeafMark, Wordmark (sm/md/lg/xl), AgentBadge, Tagline
    Sidebar.jsx               ← navigation with per-section agent attribution
    TopBar.jsx                ← breadcrumb, agent badges, actions
    VoiceAssistant.jsx        ← modal + floating FAB
    ui.jsx                    ← Card, SectionHeader, Tag, Confidence, Progress,
                                MiniActions, VoiceCommandBlock, SourceChip, Stat
  pages/
    Intake.jsx                ← voice onboarding (Screen 1)
    IdeaProfile.jsx           ← "The idea"
    TargetAudience.jsx        ← "Who buys"
    MarketValidation.jsx      ← "Worth doing?"
    Locations.jsx             ← "Where"
    Financials.jsx            ← "Money & grants"
    ActionPlan.jsx            ← "Your next 7 days"
    AgentWorkspace.jsx        ← "Flora & Finn" — agent + datastore workspace
  data/
    londonDatasets.js         ← 12-dataset index (mock but realistic slugs)
```

### Production build & deployment
- `vite.config.js` sets `base: '/horizon/'` in production
- `.github/workflows/deploy.yml` builds and publishes to GitHub Pages on
  every push to `main`
- GitHub Pages must have **Source: GitHub Actions** in Settings → Pages
  (one-time manual step done)
- The default GitHub-generated `static.yml` workflow was conflicting (it
  uploaded raw source instead of `dist/`) and was deleted; `deploy.yml` is
  the only publisher

### Repo remote
- SSH: `git@github.com:khiz-dev/horizon.git`
  (HTTPS auth via `gh` was expired; SSH ed25519 key worked cleanly)

---

## 8. Voice UX details

The voice modal is the heart of the dashboard experience:

1. **Trigger** — bottom-right floating button (`Talk to Flora & Finn`) or `⌘⇧V`
2. **Open** — modal with cream sheet on blurred backdrop
3. **Listening state** — animated waveform + live transcript appearing
4. **Thinking state** — `Routing to Action Plan, Money and Location modules…`
5. **Response state** — gradient bubble with the assistant's reply
6. **Apply state** — a grid of "Your plan, updating" cards lights up showing
   which dashboard sections were mutated
7. **Suggestions** — quick chips at the bottom (*"Flora, challenge my riskiest
   assumption"*, *"Finn, find grants"*, etc.)
8. **Auto-close** — *Apply & close* button

The scripted demo example: founder says *"Finn, I only have £5k and I want
to avoid a storefront."* — Finn responds with a lean-route plan and four
dashboard sections (The idea, Money & grants, Your next 7 days, Locations)
visually update.

---

## 9. Hackathon context

**Track:** Economic Systems — helping individuals and organisations make
better economic decisions, unlock opportunities, and optimise costs.

**Why this fits:**
- Founders are individuals making consequential economic decisions
  (often their life savings) with very little signal
- The London Datastore is rich public data that's almost never surfaced
  to non-analysts in usable form
- A voice-first interface lowers the bar for first-time founders who
  wouldn't otherwise navigate dashboards, spreadsheets, or grant portals
- The agent-led validation flow specifically targets *not spending money
  before validation* — which is the most expensive economic mistake
  most founders make

**Differentiation:**
- Two named, role-distinct agents (not one generic "AI advisor")
- Public-data-anchored intelligence with visible provenance — every
  recommendation links back to the London Datastore dataset that informed it
- Voice mutates structured plan data, not just chat
- London-specific (boroughs, TfL, GLA funding) rather than generic global advice

---

## 10. Design principles to preserve

If extending this app, hold the line on:

- **Voice everywhere** — never make the founder fill a form
- **Profile builds quietly** — discovery shouldn't feel like an interview
  with a clipboard; it should feel like talking to a smart friend
- **Always cite the source** — every Finn recommendation must trace back
  to a London Datastore entry
- **No black/white-typography dashboards** — the editorial cream + forest
  palette is the brand; resist the urge to "modernise" by going dark
- **"Potentially relevant", not "you are eligible"** — never overpromise
  on grants or recommendations; let the founder verify
- **Two voices, two roles** — don't merge Flora & Finn into a generic
  assistant; the separation is the product
