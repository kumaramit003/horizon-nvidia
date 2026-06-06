import React from 'react'

// Flora & Finn as a "botanical bot" — a friendly rounded robot with a sprout
// on its head and an expressive glowing screen-face. Keeps the AgentFace API
// (who, state, size) so every call site keeps working.
//
// states: idle | listening | thinking | speaking | happy | celebrating

const SKIN = {
  flora: { shell: '#FBF7F0', shellEdge: '#ECE3D4', accent: '#8FBF7E', accentDark: '#6E8B6A', leaf: '#7DCC93', leafDark: '#5BAE78' },
  finn:  { shell: '#FBF7F0', shellEdge: '#E6E0D4', accent: '#6E8B6A', accentDark: '#3F5E3F', leaf: '#8FA68C', leafDark: '#3F5E3F' },
}
const SCREEN = '#23211C'
const GLOW = '#9DE3A6' // glowing green face

export function AgentFace({ who = 'flora', state = 'idle', size = 200 }) {
  const s = SKIN[who] || SKIN.flora
  const happy = state === 'happy' || state === 'celebrating'
  const celebrating = state === 'celebrating'
  const speaking = state === 'speaking'
  const thinking = state === 'thinking'
  const listening = state === 'listening'
  const openEyes = listening || speaking || thinking

  return (
    <div className="relative grid place-items-center" style={{ width: size * 0.92, height: size }}>
      <svg
        viewBox="0 0 120 140"
        className={`relative ${celebrating ? 'animate-[botBob_1s_ease-in-out_infinite]' : ''}`}
        style={{ width: size * 0.92, height: size, filter: 'drop-shadow(0 12px 18px rgba(40,66,40,0.14))' }}
      >
        <defs>
          <radialGradient id={`screen-${who}`} cx="42%" cy="36%" r="80%">
            <stop offset="0%" stopColor="#33302A" />
            <stop offset="100%" stopColor={SCREEN} />
          </radialGradient>
          <linearGradient id={`leaf-${who}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor={s.leafDark} />
            <stop offset="100%" stopColor={s.leaf} />
          </linearGradient>
        </defs>

        {/* ── Sprout ── */}
        <g style={{ transformOrigin: '60px 34px' }} className="animate-[sproutSway_4s_ease-in-out_infinite]">
          <path d="M60 40 C60 28 60 22 60 16" stroke={s.accentDark} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M60 24 C50 18 40 20 36 12 C46 8 57 12 60 24 Z" fill={`url(#leaf-${who})`} />
          <path d="M60 22 C70 15 80 17 85 9 C75 5 63 10 60 22 Z" fill={`url(#leaf-${who})`} />
        </g>

        {/* ── Ears ── */}
        <rect x="6" y="58" width="12" height="26" rx="6" fill={s.accent} />
        <rect x="102" y="58" width="12" height="26" rx="6" fill={s.accent} />

        {/* ── Head ── */}
        <rect x="16" y="40" width="88" height="60" rx="24" fill={s.shell} stroke={s.shellEdge} strokeWidth="2" />

        {/* ── Screen ── */}
        <rect x="26" y="48" width="68" height="44" rx="18" fill={`url(#screen-${who})`} />

        {/* ── Face on the screen (glowing green) ── */}
        <g style={{ filter: `drop-shadow(0 0 3px ${GLOW}99)` }}>
          {/* eyes */}
          <g
            className={thinking ? 'face-eyes-think' : ''}
            style={thinking ? { transform: 'translateY(-2px)' } : undefined}
          >
            {openEyes ? (
              <>
                <circle className="face-eye" cx="46" cy="66" r="5" fill={GLOW} />
                <circle className="face-eye" cx="74" cy="66" r="5" fill={GLOW} style={{ animationDelay: '160ms' }} />
              </>
            ) : (
              <>
                {/* closed happy eyes ^_^ */}
                <path d="M40 68 Q46 61 52 68" stroke={GLOW} strokeWidth="3.4" fill="none" strokeLinecap="round" />
                <path d="M68 68 Q74 61 80 68" stroke={GLOW} strokeWidth="3.4" fill="none" strokeLinecap="round" />
              </>
            )}
          </g>

          {/* mouth */}
          {speaking ? (
            <ellipse className="face-talk" cx="60" cy="80" rx="7" ry="5" fill={GLOW} />
          ) : thinking ? (
            <line x1="55" y1="80" x2="65" y2="80" stroke={GLOW} strokeWidth="3" strokeLinecap="round" opacity="0.85" />
          ) : (
            <path d={happy ? 'M50 78 Q60 88 70 78' : 'M52 79 Q60 85 68 79'} stroke={GLOW} strokeWidth="3.2" fill="none" strokeLinecap="round" />
          )}
        </g>

        {/* curious "?" while thinking */}
        {thinking && (
          <text x="104" y="44" fontSize="16" fontWeight="700" fill={s.accentDark} className="animate-breathe" style={{ fontFamily: 'Inter, sans-serif' }}>?</text>
        )}

        {/* ── Body ── */}
        <rect x="34" y="98" width="52" height="34" rx="15" fill={s.shell} stroke={s.shellEdge} strokeWidth="2" />
        {/* chest sprout emblem */}
        <circle cx="60" cy="115" r="9" fill="none" stroke={s.accent} strokeWidth="2" />
        <path d="M60 119 C57 116 54 116 53 112 C57 112 60 114 60 119 Z" fill={s.accent} />
        <path d="M60 118 C63 115 66 116 67 112 C63 112 60 114 60 118 Z" fill={s.accent} />

        {/* ── Arms ── (raised when celebrating, otherwise resting) */}
        {celebrating ? (
          <>
            <rect x="20" y="92" width="10" height="22" rx="5" fill={s.shell} stroke={s.shellEdge} strokeWidth="1.5" transform="rotate(-35 25 103)" />
            <rect x="90" y="92" width="10" height="22" rx="5" fill={s.shell} stroke={s.shellEdge} strokeWidth="1.5" transform="rotate(35 95 103)" />
          </>
        ) : (
          <>
            <rect x="26" y="104" width="9" height="20" rx="4.5" fill={s.shell} stroke={s.shellEdge} strokeWidth="1.5" />
            <rect x="85" y="104" width="9" height="20" rx="4.5" fill={s.shell} stroke={s.shellEdge} strokeWidth="1.5" />
          </>
        )}
      </svg>

      {/* confetti when celebrating */}
      {celebrating && (
        <div className="pointer-events-none absolute inset-0">
          {[['10%', '#FF9259'], ['28%', '#7DCC93'], ['52%', '#FFD659'], ['72%', '#B19BFF'], ['88%', '#FF8A91']].map(([left, c], i) => (
            <span key={i} className="absolute top-2 h-1.5 w-1.5 rounded-full animate-[confetti_1.4s_ease-in-out_infinite]"
              style={{ left, background: c, animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
      )}
    </div>
  )
}
