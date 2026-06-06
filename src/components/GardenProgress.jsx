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
        {/* pot */}
        <path d="M16 62 L44 62 L41 78 L19 78 Z" fill="#C99A6B" />
        <rect x="14" y="58" width="32" height="6" rx="2" fill="#B5854F" />
        {/* soil */}
        <ellipse cx="30" cy="60" rx="13" ry="3" fill="#5B4636" />
        {/* stem */}
        <path d="M30 60 C30 46 30 38 30 30" stroke="#5BAE78" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        {/* lower leaves */}
        <path d="M30 50 C22 47 16 49 12 42 C20 38 28 42 30 50 Z" fill="#7DCC93" />
        <path d="M30 48 C38 45 44 47 48 40 C40 36 32 40 30 48 Z" fill="#6BBF85" />
        {/* upper leaves */}
        {leaf2 && (
          <>
            <path d="M30 38 C24 35 19 37 16 31 C23 28 29 31 30 38 Z" fill="#8FD9A2" />
            <path d="M30 36 C36 33 41 35 44 29 C37 26 31 30 30 36 Z" fill="#7DCC93" />
          </>
        )}
        {/* bloom */}
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

// Flora's watering can with falling droplets.
function WateringCan() {
  return (
    <div className="relative" style={{ transform: 'rotate(-18deg)' }}>
      <svg viewBox="0 0 50 40" width="46" height="38">
        <path d="M10 14 L34 14 L31 32 C31 35 28 36 22 36 C16 36 13 35 13 32 Z" fill="#8FBF7E" />
        <rect x="14" y="9" width="16" height="6" rx="3" fill="#6E8B6A" />
        <path d="M34 18 L46 10" stroke="#6E8B6A" strokeWidth="3" strokeLinecap="round" />
        <path d="M10 18 C2 16 2 26 8 28" stroke="#6E8B6A" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      {/* droplets */}
      <div className="absolute" style={{ right: -2, top: 26 }}>
        {[0, 1, 2].map(i => (
          <span key={i} className="absolute h-1.5 w-1.5 rounded-full bg-sky-300 animate-[waterDrop_1s_ease-in_infinite]"
            style={{ left: i * 5, animationDelay: `${i * 220}ms` }} />
        ))}
      </div>
    </div>
  )
}

/**
 * Flora tends a garden — one plant per analysis step. The current plant is
 * watered and grows; finished plants stay bloomed with a check; Flora glides
 * to the next plant. Timer-driven so it animates smoothly while the real
 * pipeline runs in the background.
 */
export default function GardenProgress({ steps, intervalMs = 2600 }) {
  const [step, setStep] = useState(0)
  const [growing, setGrowing] = useState(1) // current plant's live stage 1..3

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
  // Flora hovers above the active plant.
  const floraLeft = `${((activeIndex + 0.5) / n) * 100}%`

  return (
    <div className="w-full">
      <div className="text-center">
        <p className="display text-[24px] leading-[1.2] text-forest-500">
          {allDone
            ? <>All planted. <span className="italic-accent text-sage-500">Your plan is blooming.</span></>
            : <>Flora's planting your plan. <span className="italic-accent text-sage-500">{steps[step]}…</span></>}
        </p>
      </div>

      <div className="relative mx-auto mt-10 max-w-[640px]">
        {/* Flora + watering can, glides to the active plant */}
        <div
          className="absolute -top-2 z-10 flex -translate-x-1/2 items-end gap-1 transition-all duration-700 ease-out"
          style={{ left: floraLeft }}
        >
          <AgentFace who="flora" state={allDone ? 'celebrating' : 'happy'} size={84} />
          {!allDone && <div className="mb-3 -ml-2"><WateringCan /></div>}
        </div>

        {/* plant row on a soil strip */}
        <div className="mt-24 flex items-end justify-between rounded-b-2xl border-b-[6px] border-[#C8A06E] px-1">
          {steps.map((label, i) => {
            const done = i < step
            const isActive = i === step && !allDone
            const stage = done || allDone ? 3 : isActive ? growing : 0
            return (
              <div key={label} className="flex flex-1 flex-col items-center">
                <div className="relative grid h-[80px] place-items-end">
                  <Plant stage={stage} />
                  {(done || allDone) && (
                    <span className="absolute -right-0.5 top-0 grid h-5 w-5 place-items-center rounded-full bg-sage-500 text-white shadow-soft animate-[growPop_0.5s_ease]">
                      <Check size={12} />
                    </span>
                  )}
                </div>
                <div className={`mt-2 max-w-[92px] text-center text-[10.5px] leading-tight ${done || allDone ? 'text-forest-500 font-medium' : isActive ? 'text-sage-600 font-medium' : 'text-ink-300'}`}>
                  {label}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-5 text-center text-[11.5px] text-ink-400">
          {allDone ? 'Finishing touches…' : `${step} of ${steps.length} grown`}
        </div>
      </div>
    </div>
  )
}
