import React from 'react'
import {
  Briefcase, MapPin, Layers, Sprout, Sparkles, PoundSterling,
  ArrowUpRight, AlertTriangle, Mic, Quote
} from 'lucide-react'
import { Card, SectionHeader, Confidence, Tag, Progress, MiniActions, VoiceCommandBlock, AskWhyButton } from '../components/ui'

const clarityRows = [
  { label: 'Customer clarity',    value: 88, level: 'High'   },
  { label: 'Problem clarity',     value: 64, level: 'Medium' },
  { label: 'Revenue model',       value: 82, level: 'High'   },
  { label: 'Location clarity',    value: 58, level: 'Medium' },
  { label: 'Competition clarity', value: 32, level: 'Low'    },
  { label: 'Funding clarity',     value: 38, level: 'Low'    },
  { label: 'Risk clarity',        value: 60, level: 'Medium' },
]

const assumptions = [
  { text: "You're targeting weekday office demand.",                  tag: 'Opportunity', tone: 'mint' },
  { text: 'Corporate catering is the safer first move, not a shop.', tag: 'Recommended', tone: 'peach' },
  { text: 'Liverpool Street works because of office density.',       tag: 'Opportunity', tone: 'sky' },
  { text: "There's a lot of competition — defensibility matters.",   tag: 'Risk',        tone: 'rose' },
]

const openQuestions = [
  'What is your starting budget?',
  'Pop-ups or delivery first?',
  'What price per meal are you considering?',
  'Suppliers or kitchen access already lined up?',
]

export default function IdeaProfile() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="relative overflow-hidden !p-8">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full gradient-soft-peach opacity-60 blur-2xl" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <Tag kind="Recommended" icon={Sparkles}>Lean validation path</Tag>
                <Tag kind="Insight">Niche positioning</Tag>
                <Tag kind="Missing Info">Funding plan</Tag>
              </div>
              <h2 className="mt-5 display text-[44px] leading-[1.05] text-ink-900">
                Halal Healthy Lunch <span className="italic-accent text-peach-500">&amp;</span> Catering
              </h2>
              <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-ink-500">
                A halal, health-focused lunch and corporate catering service for office workers around <span className="text-ink-900">Liverpool Street</span>. Jill suggests starting with B2B pre-orders and a pop-up before signing any lease.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <Field icon={Briefcase} label="Business type" value="Food · B2B Catering" />
                <Field icon={Sprout}    label="Stage"         value="Idea" />
                <Field icon={MapPin}    label="Physical site" value="Maybe — pop-up first" />
                <Field icon={PoundSterling} label="Revenue"   value="Catering · Subs · Pop-ups" />
              </div>
            </div>
          </Card>

          {/* Clarity score card */}
          <Card className="relative overflow-hidden !p-7">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full gradient-soft-butter opacity-70 blur-2xl" />
            <div className="relative">
              <div className="section-eyebrow">Founder clarity</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="display text-[72px] leading-none text-ink-900">78</span>
                <span className="mb-2 text-[15px] text-ink-500">/ 100</span>
                <span className="mb-2 ml-auto pill bg-mint-100 border-mint-200">↑ 12 since intake</span>
              </div>
              <p className="mt-3 text-[13.5px] text-ink-500">You're clearer than 64% of founders at this stage.</p>
              <div className="mt-5 grid grid-cols-9 gap-0.5">
                {Array.from({ length: 27 }).map((_, i) => {
                  const filled = i < Math.round((78 / 100) * 27)
                  return <span key={i} className={`h-6 rounded-sm ${filled ? 'bg-peach-500' : 'bg-cream-200'}`} />
                })}
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Jill's note */}
      <Card className="relative overflow-hidden !p-7">
        <div className="absolute -left-10 top-1/2 -translate-y-1/2 h-48 w-48 rounded-full gradient-soft-lavender opacity-50 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-orb shadow-soft">
            <Quote size={18} className="text-white" />
          </span>
          <div className="flex-1">
            <div className="section-eyebrow mb-1.5">Jill's read on the idea</div>
            <p className="display text-[22px] leading-snug text-ink-900">
              "It's a real personal pain in a high-density office patch — that's a strong starting point. The risk isn't whether people want lunch. It's whether <span className="italic-accent text-peach-500">they'll keep choosing you over the place next door.</span>"
            </p>
          </div>
          <AskWhyButton>What changed?</AskWhyButton>
        </div>
      </Card>

      {/* Clarity + Assumptions */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Card className="!p-7">
          <SectionHeader
            eyebrow="Clarity breakdown"
            title="Where it's solid, where it isn't"
            right={<AskWhyButton />}
          />
          <div className="space-y-4">
            {clarityRows.map(r => (
              <div key={r.label}>
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="text-ink-900">{r.label}</span>
                  <Confidence level={r.level} />
                </div>
                <Progress
                  value={r.value}
                  tone={r.level === 'High' ? 'mint' : r.level === 'Low' ? 'rose' : 'coral'}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="!p-7">
          <SectionHeader
            eyebrow="Assumptions"
            title="What Jill is currently believing"
            description="Accept, edit or challenge. The plan updates."
            right={<AskWhyButton />}
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {assumptions.map(a => (
              <div key={a.text} className={`rounded-2xl border border-black/[0.05] p-5 gradient-soft-${a.tone}`}>
                <Tag kind={a.tag}>{a.tag}</Tag>
                <p className="mt-3 display text-[18px] leading-snug text-ink-900">{a.text}</p>
                <MiniActions />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Open questions + voice */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="!p-7">
          <SectionHeader
            eyebrow="Open questions"
            title="Answer these to push clarity to 90%"
            right={<button className="btn-text">Ask Jill in voice <Mic size={12} /></button>}
          />
          <ul className="divide-y divide-black/[0.05]">
            {openQuestions.map((q, i) => (
              <li key={q} className="flex items-center gap-4 py-3.5">
                <span className="display grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream-100 text-[16px] text-ink-900">
                  {i + 1}
                </span>
                <span className="flex-1 text-[15px] text-ink-900">{q}</span>
                <button className="btn-ghost text-[12px]">Answer <ArrowUpRight size={11} /></button>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-butter-100 border border-butter-200 px-4 py-3 text-[13px] text-ink-900">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> Knowing your budget and channel unlocks accurate financials and grant matching.
          </div>
        </Card>

        <VoiceCommandBlock
          commands={[
            'Make this more premium.',
            'Focus on B2B catering first.',
            'Assume I only have £5k.',
            'Challenge my riskiest assumption.',
          ]}
        />
      </div>
    </div>
  )
}

function Field({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-cream-100 text-ink-700">
        <Icon size={14} />
      </span>
      <div className="min-w-0">
        <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500">{label}</div>
        <div className="mt-0.5 truncate text-[13.5px] font-medium text-ink-900">{value}</div>
      </div>
    </div>
  )
}
