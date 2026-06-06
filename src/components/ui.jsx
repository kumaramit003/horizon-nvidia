import React from 'react'
import { Check, Pencil, X, RefreshCw, HelpCircle, Sparkles, ArrowUpRight, Database } from 'lucide-react'

export function Card({ className = '', children, padded = true, ...rest }) {
  return (
    <div className={`card ${padded ? 'p-6' : ''} ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function SectionHeader({ eyebrow, title, description, right }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 flex-1">
        {eyebrow && <div className="section-eyebrow mb-2">{eyebrow}</div>}
        <h2 className="display text-[24px] font-normal leading-tight tracking-tight text-forest-500">{title}</h2>
        {description && <p className="mt-1.5 text-[14px] leading-relaxed text-ink-500">{description}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  )
}

const tagStyles = {
  Opportunity:    'bg-mint-100 text-ink-800 border-mint-200',
  Risk:           'bg-rose-100 text-ink-800 border-rose-200',
  Positive:       'bg-mint-100 text-ink-800 border-mint-200',
  Recommended:    'bg-peach-100 text-peach-600 border-peach-200',
  'Missing Info': 'bg-butter-100 text-ink-800 border-butter-200',
  Neutral:        'bg-cream-50 text-ink-700 border-ink-100',
  Insight:        'bg-lavender-100 text-lavender-500 border-lavender-200',
}

export function Tag({ kind = 'Neutral', children, icon: Icon }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${tagStyles[kind] || tagStyles.Neutral}`}>
      {Icon && <Icon size={11} />}
      {children}
    </span>
  )
}

const confStyles = {
  High: 'bg-mint-100 text-ink-800 border-mint-200',
  Medium: 'bg-butter-100 text-ink-800 border-butter-200',
  'Low-Medium': 'bg-butter-100 text-ink-800 border-butter-200',
  Low: 'bg-rose-100 text-ink-800 border-rose-200',
}

export function Confidence({ level, label = 'Confidence' }) {
  const dot =
    level === 'High'  ? 'bg-mint-300' :
    level === 'Low'   ? 'bg-rose-300' :
                        'bg-butter-300'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${confStyles[level] || confStyles.Medium}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}: {level}
    </span>
  )
}

export function Progress({ value, label, sublabel, tone = 'coral' }) {
  const bar =
    tone === 'mint'     ? 'bg-mint-300' :
    tone === 'lavender' ? 'bg-lavender-400' :
    tone === 'sky'      ? 'bg-sky-300' :
    tone === 'rose'     ? 'bg-rose-300' :
                          'bg-peach-500'
  return (
    <div>
      {(label || sublabel) && (
        <div className="mb-2 flex items-center justify-between text-[12.5px]">
          <span className="text-ink-700">{label}</span>
          <span className="font-mono text-ink-500">{sublabel ?? `${value}%`}</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-cream-200">
        <div
          className={`h-full rounded-full ${bar}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  )
}

export function MiniActions({ onAccept, onEdit, onChallenge }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-1.5">
      <button className="btn-ghost !py-1 !px-2.5 text-[11.5px] hover:!bg-mint-100">
        <Check size={12} /> Accept
      </button>
      <button className="btn-ghost !py-1 !px-2.5 text-[11.5px]">
        <Pencil size={12} /> Edit
      </button>
      <button className="btn-ghost !py-1 !px-2.5 text-[11.5px] hover:!bg-rose-100">
        <X size={12} /> Challenge
      </button>
    </div>
  )
}

export function AskWhyButton({ children = 'Ask why' }) {
  return (
    <button className="btn-ghost !py-1 !px-2.5 text-[11.5px]">
      <HelpCircle size={12} /> {children}
    </button>
  )
}

export function RegenerateButton() {
  return (
    <button className="btn-ghost text-[12.5px]">
      <RefreshCw size={13} /> Regenerate
    </button>
  )
}

export function VoiceCommandBlock({ commands, title = 'Try with your voice' }) {
  const openWith = (cmd) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('voice-prefill', { detail: cmd }))
    }
  }
  return (
    <div className="card relative overflow-hidden p-6">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full gradient-soft-peach opacity-70 blur-2xl" />
      <div className="relative">
        <div className="section-eyebrow mb-2 flex items-center gap-1.5">
          <Sparkles size={11} className="text-peach-500" /> {title}
        </div>
        <p className="text-[14px] text-ink-700">Click a prompt below to open the voice panel pre-filled.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {commands.map((c, i) => (
            <button
              key={i}
              onClick={() => openWith(c)}
              className="rounded-full border border-peach-200 bg-peach-50 px-3.5 py-2 text-[12.5px] font-medium text-peach-600 transition-all hover:bg-peach-100"
            >
              "{c}"
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Shown on a page while its section is still being generated by Finn.
// Animated shimmer skeleton + a friendly "researching this" line.
export function SectionLoading({ label = 'this section', who = 'Finn' }) {
  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden !p-7">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full gradient-soft-peach opacity-50 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-orb-finn">
            <span className="h-2 w-2 rounded-full bg-white/80 animate-breathe" />
          </span>
          <div className="flex-1">
            <div className="section-eyebrow mb-1.5 flex items-center gap-2">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-sage-400 animate-breathe" />
                <span className="h-1.5 w-1.5 rounded-full bg-sage-400 animate-breathe" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-sage-400 animate-breathe" style={{ animationDelay: '300ms' }} />
              </span>
              {who} is researching {label}…
            </div>
            <div className="h-2.5 w-2/3 overflow-hidden rounded-full bg-cream-200">
              <div className="h-full w-1/2 animate-shimmer rounded-full bg-gradient-to-r from-transparent via-peach-300 to-transparent" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="card !p-6">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 shrink-0 rounded-2xl bg-cream-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/2 rounded-full bg-cream-200 animate-pulse" />
                <div className="h-2.5 w-3/4 rounded-full bg-cream-100 animate-pulse" />
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <div className="h-2.5 w-full rounded-full bg-cream-100 animate-pulse" />
              <div className="h-2.5 w-5/6 rounded-full bg-cream-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function EmptyPage({ label = 'data' }) {
  return (
    <div className="card !p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl gradient-soft-peach">
        <Sparkles size={18} className="text-peach-500" />
      </div>
      <h2 className="mt-5 display text-[24px] text-forest-500">No {label} yet</h2>
      <p className="mt-2 max-w-[460px] mx-auto text-[14px] text-ink-500">
        Finn hasn't generated this section for the current workspace.
        Open <strong>Flora &amp; Finn</strong> and click <strong>Re-run analysis</strong> to build it.
      </p>
    </div>
  )
}

export function SourceChip({ name, publisher, slug, small }) {
  return (
    <a
      href={slug ? `https://data.london.gov.uk/dataset/${slug}` : 'https://data.london.gov.uk/dataset/'}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-cream-50 ${small ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-[11px]'} font-medium text-ink-700 transition-colors hover:bg-white hover:text-ink-900`}
    >
      <Database size={small ? 10 : 11} className="text-peach-500" />
      <span className="text-ink-500">London Datastore</span>
      <span className="hidden sm:inline">·</span>
      <span className="hidden sm:inline truncate max-w-[160px]">{name}</span>
    </a>
  )
}

export function Stat({ label, value, hint, accent }) {
  return (
    <div className={`rounded-2xl border border-black/[0.05] p-4 ${accent || 'bg-cream-50'}`}>
      <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500">{label}</div>
      <div className="mt-1 display text-[34px] leading-none text-ink-900">{value}</div>
      {hint && <div className="mt-2 text-[12px] text-ink-500">{hint}</div>}
    </div>
  )
}
