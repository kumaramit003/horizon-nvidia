import React from 'react'
import { AgentFace } from './AgentFace'

// Hand-drawn leaf glyph used in the mark and across icons.
export function LeafMark({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="leafG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C5D5C0" />
          <stop offset="1" stopColor="#FFE9D6" />
        </linearGradient>
      </defs>
      <path d="M4 19 C 6 9, 14 4, 21 5 C 19 14, 12 19, 4 19 Z" fill="url(#leafG)" />
      <path d="M4 19 C 9 15, 15 11, 21 5" stroke="#172E20" strokeWidth="1.1" fill="none" opacity="0.45" strokeLinecap="round" />
    </svg>
  )
}

const WORDMARK_SIZES = {
  sm: { box: 'h-8 w-8 rounded-lg',  icon: 16, name: 'text-[13.5px]', sub: 'text-[9.5px]',  subSpacing: 'mt-0.5' },
  md: { box: 'h-10 w-10 rounded-xl', icon: 20, name: 'text-[16.5px]', sub: 'text-[10px]',   subSpacing: 'mt-0.5' },
  lg: { box: 'h-12 w-12 rounded-2xl', icon: 24, name: 'text-[22px]',  sub: 'text-[10.5px]', subSpacing: 'mt-1' },
  xl: { box: 'h-14 w-14 rounded-2xl', icon: 28, name: 'text-[26px]',  sub: 'text-[11px]',   subSpacing: 'mt-1' },
}

export function Wordmark({ size = 'md', subtitle = 'London · Voice-first advisor', className = '' }) {
  const cfg = WORDMARK_SIZES[size] || WORDMARK_SIZES.md
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className={`relative grid ${cfg.box} place-items-center bg-forest-500 shadow-soft`}>
        <LeafMark size={cfg.icon} className="opacity-95 drop-shadow" />
      </span>
      <div className="leading-tight">
        <div className={`display ${cfg.name} text-forest-500 tracking-tight`}>
          Finn <span className="italic-accent text-sage-500">&amp;</span> Flora
        </div>
        {subtitle && (
          <div className={`${cfg.sub} ${cfg.subSpacing} font-medium uppercase tracking-[0.18em] text-ink-500`}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}

export function AgentBadge({ who, status, size = 'sm', compact = false }) {
  const isFlora = who === 'flora'
  const label = isFlora ? 'Flora' : 'Finn'
  const sub = isFlora ? 'discovering' : 'researching'
  const px = compact
    ? 'max-w-full px-2 py-0.5 text-[10.5px]'
    : size === 'md' ? 'px-3 py-1.5 text-[12px]' : 'px-2.5 py-1 text-[11px]'
  const faceSize = compact ? 22 : 28
  const faceState =
    status === 'processing' || status === 'discovering' || status === 'researching' ? 'thinking'
    : status === 'ready' ? 'idle'
    : 'idle'
  return (
    <span className={`inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-black/[0.05] bg-white ${px} font-medium text-forest-500`}>
      <AgentFace who={who} state={faceState} size={faceSize} />
      <span className="truncate">{label}</span>
      {status && <span className="shrink-0 text-ink-500">· {status === 'auto' ? sub : status}</span>}
    </span>
  )
}

// Tagline can be inline (default) or block-centered via `block` prop.
export function Tagline({ className = '', block = false, withRule = true }) {
  const Tag = block ? 'div' : 'span'
  const display = block ? 'flex justify-center' : 'inline-flex'
  return (
    <Tag className={`${display} items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-sage-500 ${className}`}>
      {withRule && <span className="h-px w-6 bg-sage-300" />}
      <span>Flora discovers <span className="text-ink-300">·</span> Finn plans <span className="text-ink-300">·</span> You launch</span>
      {withRule && <span className="h-px w-6 bg-sage-300" />}
    </Tag>
  )
}
