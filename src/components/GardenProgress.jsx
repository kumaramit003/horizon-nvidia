import React, { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { AgentFace } from './AgentFace'

// A plant grown by stage 0..3. Anchored at the bottom; grows by scaling up.
function Plant({ stage }) {
  const scale = [0.28, 0.55, 0.8, 1][Math.max(0, Math.min(3, stage))]
  const leaf2 = stage >= 2
  const bloom = stage >= 3
  return (
    <div
      className="origin-bottom transition-transform duration-700 ease-out"
      style={{ transform: `scaleY(${scale}) scale(${0.6 + scale * 0.4})` }}
    >
      <svg viewBox="0 0 60 80" width="56" height="74">
        <path d="M16 62 L44 62 L41 78 L19 78 Z" fill="#C99A6B" />
        <rect x="14" y="58" width="32" height="6" rx="2" fill="#B5854F" />
        <ellipse cx="30" cy="60" rx="13" ry="3" fill="#5B4636" />
        <path d="M30 60 C30 46 30 38 30 30" stroke="#5BAE78" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M30 50 C22 47 16 49 12 42 C20 38 28 42 30 50 Z" fill="#7DCC93" />
        <path d="M30 48 C38 45 44 47 48 40 C40 36 32 40 30 48 Z" fill="#6BBF85" />
        {leaf2 && (
          <>
            <path d="M30 38 C24 35 19 37 16 31 C23 28 29 31 30 38 Z" fill="#8FD9A2" />
            <path d="M30 36 C36 33 41 35 44 29 C37 26 31 30 30 36 Z" fill="#7DCC93" />
          </>
        )}
        {bloom && (
          <g>
            {[0, 72, 144, 216, 288].map(a => (
              <ellipse key={a} cx="30" cy="24" rx="4" ry="7" fill="#FFB582" transform={`rotate(${a} 30 30)`} />
            ))}
            <circle cx="30" cy="30" r="4.5" fill="#FFD659" />
          </g>
        )}
      </svg>
    </div>
  )
}

// Finn's watering can — water streams from the rose head at the spout tip only.
function WateringCan({ pouring = false }) {
  return (
    <div
      className="relative animate-[canPour_2.6s_ease-in-out_infinite]"
      style={{ transformOrigin: '18px 22px', width: 52, height: 44 }}
    >
      <svg viewBox="0 0 52 44" width="52" height="44" className="relative z-[1]">
        <path d="M8 14 L36 14 L32 34 C32 37 28 38 22 38 C16 38 12 37 12 34 Z" fill="#5C8AA6" />
        <rect x="14" y="8" width="18" height="7" rx="3" fill="#33586E" />
        <path d="M8 18 C0 16 0 26 6 28" stroke="#33586E" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M36 18 L50 26" stroke="#33586E" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="50" cy="26" r="4" fill="#33586E" />
        <circle cx="48" cy="25" r="0.7" fill="#A8D8F0" />
        <circle cx="50" cy="24" r="0.7" fill="#A8D8F0" />
        <circle cx="52" cy="25" r="0.7" fill="#A8D8F0" />
      </svg>
      {pouring && (
        <div
          className="pointer-events-none absolute z-0"
          style={{ left: 46, top: 28, width: 12, height: 72 }}
        >
          {[0, 1, 2, 3, 4].map(i => (
            <span
              key={i}
              className="absolute left-1/2 h-2.5 w-[5px] -translate-x-1/2 rounded-full bg-sky-300/85 animate-[waterFall_1.1s_ease-in_infinite]"
              style={{ top: 0, animationDelay: `${i * 160}ms`, marginLeft: `${(i % 3 - 1) * 3}px` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Finn tends a garden — one plant per research step. The current plant is
 * watered and grows; finished plants stay bloomed with a check; Finn glides
 * to the next plant. Timer-driven so it animates smoothly while the real
 * pipeline runs in the background.
 */
export default function GardenProgress({ steps, intervalMs = 2600 }) {
  const [step, setStep] = useState(0)
  const [growing, setGrowing] = useState(1)

  useEffect(() => {
    if (step >= steps.length) return
    setGrowing(1)
    const g1 = setTimeout(() => setGrowing(2), intervalMs * 0.35)
    const g2 = setTimeout(() => setGrowing(3), intervalMs * 0.7)
    const next = setTimeout(() => setStep(s => Math.min(s + 1, steps.length)), intervalMs)
    return () => { clearTimeout(g1); clearTimeout(g2); clearTimeout(next) }
  }, [step, steps.length, intervalMs])

  const allDone = step >= steps.length
  const activeIndex = allDone ? steps.length - 1 : step
  const n = steps.length
  const finnLeft = `${((activeIndex + 0.5) / n) * 100}%`

  return (
    <div className="w-full">
      <div className="text-center">
        <p className="display text-[24px] leading-[1.2] text-forest-500">
          {allDone
            ? <>All planted. <span className="italic-accent text-sage-500">Your plan is blooming.</span></>
            : <>Finn's reading London &amp; growing your plan. <span className="italic-accent text-sage-500">{steps[step]}…</span></>}
        </p>
      </div>

      <div className="relative mx-auto mt-12 max-w-[820px] px-4">
        {/* Anchor the can spout (right edge) above each plant — not Finn's centre */}
        <div
          className="absolute -top-4 z-10 transition-all duration-700 ease-out"
          style={{ left: finnLeft, transform: 'translateX(-100%)' }}
        >
          <div className="flex items-end">
            <AgentFace who="finn" state={allDone ? 'celebrating' : 'happy'} size={84} />
            {!allDone && (
              <div className="relative -ml-3 mb-5">
                <WateringCan pouring />
              </div>
            )}
          </div>
        </div>

        {/* plant row — extra gap so Finn + water stream have room */}
        <div className="mt-36 flex items-end justify-center gap-6 sm:gap-8 md:gap-10 rounded-b-2xl border-b-[6px] border-[#C8A06E] px-2 pb-1">
          {steps.map((label, i) => {
            const done = i < step
            const isActive = i === step && !allDone
            const stage = done || allDone ? 3 : isActive ? growing : 0
            return (
              <div key={label} className="flex min-w-0 flex-1 max-w-[96px] flex-col items-center">
                <div className="relative grid h-[110px] place-items-end">
                  <Plant stage={stage} />
                  {(done || allDone) && (
                    <span className="absolute -right-0.5 top-0 grid h-5 w-5 place-items-center rounded-full bg-sage-500 text-white shadow-soft animate-[growPop_0.5s_ease]">
                      <Check size={12} />
                    </span>
                  )}
                </div>
                <div className={`mt-3 max-w-full text-center text-[10.5px] leading-tight ${done || allDone ? 'text-forest-500 font-medium' : isActive ? 'text-sage-600 font-medium' : 'text-ink-300'}`}>
                  {label}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 text-center text-[11.5px] text-ink-400">
          {allDone ? 'Finishing touches…' : `${step} of ${steps.length} grown`}
        </div>
      </div>
    </div>
  )
}
