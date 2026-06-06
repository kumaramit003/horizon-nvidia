import React from 'react'
import { Leaf } from 'lucide-react'

// Small leaf SVG (organic, hand-drawn feel)
export function LeafMark({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="leafG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8FA68C" />
          <stop offset="1" stopColor="#3F5E3F" />
        </linearGradient>
      </defs>
      <path
        d="M4 19 C 6 9, 14 4, 21 5 C 19 14, 12 19, 4 19 Z"
        fill="url(#leafG)"
      />
      <path
        d="M4 19 C 9 15, 15 11, 21 5"
        stroke="#172E20"
        strokeWidth="1.1"
        fill="none"
        opacity="0.55"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Wordmark({ size = 'md', className = '' }) {
  const sz = size === 'lg' ? 'text-[20px]' : size === 'sm' ? 'text-[13px]' : 'text-[15px]'
  const sub = size === 'lg' ? 'text-[11px]' : 'text-[10.5px]'
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-forest-500 shadow-soft">
        <LeafMark size={18} className="opacity-95" />
      </span>
      <div className="leading-tight">
        <div className={`display ${sz} text-forest-500`}>
          Finn <span className="italic-accent text-sage-500">&amp;</span> Flora
        </div>
        <div className={`${sub} font-medium uppercase tracking-[0.18em] text-ink-500`}>
          London · Voice-first advisor
        </div>
      </div>
    </div>
  )
}

export function AgentBadge({ who, status, size = 'sm' }) {
  // who: 'finn' | 'flora'
  const isFlora = who === 'flora'
  const grad = isFlora ? 'gradient-orb-flora' : 'gradient-orb-finn'
  const label = isFlora ? 'Flora' : 'Finn'
  const sub = isFlora ? 'discovering' : 'researching'
  const px = size === 'md' ? 'px-3 py-1.5 text-[12px]' : 'px-2.5 py-1 text-[11px]'
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border border-black/[0.05] bg-white ${px} font-medium text-forest-500`}>
      <span className={`grid h-4 w-4 place-items-center rounded-full ${grad}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
      </span>
      <span>{label}</span>
      {status && <span className="text-ink-500">· {status === 'auto' ? sub : status}</span>}
    </span>
  )
}

export function Tagline({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-[0.22em] text-sage-500 ${className}`}>
      Flora discovers · Finn plans · You launch
    </span>
  )
}
