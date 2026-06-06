# FounderOS London

A voice-first, agentic startup advisor mockup for early-stage London founders. NemoClaw orchestrates 7 specialist agents that read public data from the [London Datastore](https://data.london.gov.uk/dataset/) to turn a rough idea into a validated business plan.

**Live demo:** https://khiz-dev.github.io/horizon/

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## ElevenLabs voice

Copy real credentials into `.env`:

```bash
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID_FINN=...
ELEVENLABS_VOICE_ID_FLORA=...
```

Run the voice API in one terminal:

```bash
npm run voice:server
```

Run the web app in another terminal:

```bash
npm run dev
```

The Vite dev server proxies `/api/voice/*` to `http://localhost:8787`, keeping the API key server-side.

## Build

```bash
npm run build
```

Outputs to `dist/`. The `base` path in `vite.config.js` is `/horizon/` in production so the build works under GitHub Pages.

## Deployment

`.github/workflows/deploy.yml` builds the site and publishes to GitHub Pages on every push to `main`. Enable Pages in the repo settings (Settings → Pages → Source: **GitHub Actions**) after the first push.

## Data sources

All intelligence in the mockup is anchored to public datasets on the [London Datastore](https://data.london.gov.uk/dataset/). See `src/data/londonDatasets.js` for the indexed set:

- Workplace Zone Statistics
- London Business Demography
- 2021 Census · Religion by Ward
- London Borough Profiles
- High Streets Health Check
- TfL Open Data
- Survey of Londoners
- VOA Floor Space & Property
- Planning Applications
- GLA Funding & Support Directory
- Food Business Establishments
- London Air Quality Data

## Stack

React + Vite + Tailwind CSS · Lucide icons. No backend.
