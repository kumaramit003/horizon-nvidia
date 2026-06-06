import React from 'react'

// An expressive, animated agent "face" — a glowing orb with eyes that blink
// and a mouth that reacts to state. Replaces the plain circular orb.
//
// states: idle | listening | thinking | speaking | happy
// who:    flora (warm peach) | finn (forest green)

const PALETTE = {
  flora:     { from: '#FFE9D6', mid: '#FF9259', to: '#FF6B3D', ring: 'rgba(255,178,130,0.55)' },
  finn:      { from: '#C5D5C0', mid: '#8FA68C', to: '#3F5E3F', ring: 'rgba(168,192,162,0.55)' },
  listening: { from: '#FFF1B8', mid: '#FFB582', to: '#FF6B3D', ring: 'rgba(255,178,130,0.65)' },
}

export function AgentFace({ who = 'flora', state = 'idle', size = 200 }) {
  const isListening = state === 'listening'
  const pal = isListening ? PALETTE.listening : (PALETTE[who] || PALETTE.flora)
  const gid = `orb-${who}-${isListening ? 'l' : 'n'}`
  const happy = state === 'happy' || state === 'speaking'
  const thinking = state === 'thinking'
  const active = state !== 'idle'

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {/* breathing glow */}
      <span className="absolute rounded-full blur-3xl animate-breathe"
        style={{ inset: size * 0.04, background: pal.mid, opacity: 0.22 }} />
      <span className="absolute rounded-full blur-2xl animate-breathe"
        style={{ inset: size * 0.13, background: pal.to, opacity: 0.28, animationDelay: '500ms' }} />

      {/* ripple rings when active */}
      {active && (
        <>
          <span className="absolute inset-0 rounded-full animate-ringOut" style={{ border: `1px solid ${pal.ring}` }} />
          <span className="absolute inset-0 rounded-full animate-ringOut" style={{ border: `1px solid ${pal.ring}`, animationDelay: '900ms' }} />
        </>
      )}

      {/* floating thought dots while thinking */}
      {thinking && (
        <div className="absolute z-10" style={{ top: size * 0.04 }}>
          <div className="flex gap-1.5 rounded-full bg-white/70 px-2.5 py-1.5 shadow-soft backdrop-blur">
            {[0, 1, 2].map(i => (
              <span key={i} className="h-1.5 w-1.5 rounded-full animate-breathe" style={{ background: pal.mid, animationDelay: `${i * 180}ms` }} />
            ))}
          </div>
        </div>
      )}

      <svg viewBox="0 0 100 100" className="relative drop-shadow-sm" style={{ width: size * 0.8, height: size * 0.8 }}>
        <defs>
          <radialGradient id={gid} cx="38%" cy="30%" r="78%">
            <stop offset="0%" stopColor={pal.from} />
            <stop offset="55%" stopColor={pal.mid} />
            <stop offset="100%" stopColor={pal.to} />
          </radialGradient>
        </defs>

        <circle cx="50" cy="50" r="46" fill={`url(#${gid})`} />
        {/* glossy highlight */}
        <ellipse cx="36" cy="30" rx="19" ry="12" fill="rgba(255,255,255,0.26)" />

        {/* eyes */}
        <g className={thinking ? 'face-eyes-think' : ''} style={thinking ? { transform: 'translateY(-2px)' } : undefined}>
          {happy ? (
            <>
              <path d="M30 45 Q36 39 42 45" stroke="white" strokeWidth="3.4" fill="none" strokeLinecap="round" />
              <path d="M58 45 Q64 39 70 45" stroke="white" strokeWidth="3.4" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <rect className="face-eye" x="33.5" y="38" width="7" height="15" rx="3.5" fill="white" />
              <rect className="face-eye" x="59.5" y="38" width="7" height="15" rx="3.5" fill="white" style={{ animationDelay: '140ms' }} />
            </>
          )}
        </g>

        {/* mouth */}
        {state === 'speaking' ? (
          <ellipse className="face-talk" cx="50" cy="67" rx="8.5" ry="6" fill="rgba(255,255,255,0.94)" />
        ) : thinking ? (
          <line x1="44" y1="67" x2="56" y2="67" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        ) : (
          <path
            d={happy ? 'M37 62 Q50 75 63 62' : 'M40 65 Q50 72 60 65'}
            stroke="white" strokeWidth="3.4" fill="none" strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  )
}
