import React from 'react'
import { Users, MessageSquare, Building2, HeartPulse, CalendarDays, ArrowUpRight, Sparkles } from 'lucide-react'
import { Card, SectionHeader, Confidence, Tag, VoiceCommandBlock, AskWhyButton, SourceChip } from '../components/ui'

const segments = [
  { name: 'Office managers',      need: 'Reliable team catering',     pay: 'High',   channel: 'Direct outreach',                conf: 'Medium',      icon: Building2,   tone: 'peach' },
  { name: 'Muslim professionals', need: 'Halal healthy lunch',        pay: 'Medium', channel: 'Local ads · office partnerships', conf: 'Medium',     icon: Users,       tone: 'lavender' },
  { name: 'HR & wellness teams',  need: 'Healthy employee meals',     pay: 'High',   channel: 'LinkedIn · email',               conf: 'Low-Medium',  icon: HeartPulse,  tone: 'mint' },
  { name: 'Event organisers',     need: 'Halal catering for events',  pay: 'High',   channel: 'Partnerships',                   conf: 'Medium',      icon: CalendarDays,tone: 'butter' },
]

const personas = [
  {
    name: 'Aysha',
    title: 'Busy Finance Professional',
    role: 'Analyst · Liverpool Street',
    pain: 'Can never find a fast, healthy, halal lunch near the office.',
    trigger: 'Short lunch break, long workdays.',
    offer: 'Pre-order bowl ready in 5 minutes.',
    tone: 'peach',
    initials: 'A',
  },
  {
    name: 'Omar',
    title: 'Office Manager',
    role: 'Ops · 80-person scale-up',
    pain: 'Needs reliable catering for team lunches and client meetings.',
    trigger: 'Weekly team lunches, client events, all-hands.',
    offer: 'Recurring corporate lunch package.',
    tone: 'lavender',
    initials: 'O',
  },
]

const interviewQs = [
  'How often do you order lunch at work?',
  'What makes you choose one lunch provider over another?',
  'Would your team use recurring catering?',
  'What price would feel reasonable per head?',
]

const payTone = (v) =>
  v === 'High'   ? 'bg-mint-100 border-mint-200 text-ink-800'
  : v === 'Low'  ? 'bg-rose-100 border-rose-200 text-ink-800'
                 : 'bg-butter-100 border-butter-200 text-ink-800'

export default function TargetAudience({ dashboard }) {
  const _segments = dashboard?.segments?.length ? dashboard.segments : segments
  const _personas = dashboard?.personas?.length ? dashboard.personas : personas
  const _interviewQs = dashboard?.interview_questions?.length ? dashboard.interview_questions : interviewQs
  const _audienceConf = dashboard?.audience_confidence || 62
  return (
    <div className="space-y-10">
      {/* Headline */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="relative overflow-hidden !p-8">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full gradient-soft-lavender opacity-60 blur-2xl" />
          <div className="relative">
            <Tag kind="Insight">4 segments worth testing</Tag>
            <h2 className="mt-4 display text-[36px] leading-tight text-ink-900">
              Four people who could become <span className="italic-accent text-peach-500">your first customer.</span>
            </h2>
            <p className="mt-3 max-w-[60ch] text-[15.5px] text-ink-500">
              Ranked by combined demand × willingness to pay. Start with the segment you can reach in a week, not the one that looks biggest on paper.
            </p>
          </div>
        </Card>

        <Card className="relative overflow-hidden !p-7">
          <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full gradient-soft-peach opacity-60 blur-2xl" />
          <div className="relative">
            <div className="section-eyebrow">Audience confidence</div>
            <div className="mt-2 flex items-end gap-2">
              <span className="display text-[60px] leading-none text-ink-900">{_audienceConf}</span>
              <span className="mb-2 text-[14px] text-ink-500">/ 100 · Medium</span>
            </div>
            <ul className="mt-4 space-y-2 text-[13.5px] text-ink-700">
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-mint-300" /> Office density supports the demand story.</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-mint-300" /> Halal + healthy is a clearly underserved niche.</li>
              <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-butter-300" /> Repeat-purchase behaviour still needs validation.</li>
            </ul>
          </div>
        </Card>
      </div>

      {/* Segments — card grid (no boring table) */}
      <section>
        <SectionHeader
          eyebrow="Segments"
          title="Who fits, ranked"
          description="Ranked using ward-level demographics and the Survey of Londoners."
          right={
            <div className="flex flex-wrap items-center gap-1.5">
              <SourceChip name="Census 2021 · Religion by Ward" slug="census-2021-religion" small />
              <SourceChip name="Survey of Londoners" slug="survey-of-londoners" small />
            </div>
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {_segments.map((s, idx) => {
            const Icon = s.icon
            return (
              <div key={s.name} className="card !p-6 relative overflow-hidden">
                <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full gradient-soft-${s.tone} opacity-60 blur-2xl`} />
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-11 w-11 place-items-center rounded-2xl gradient-soft-${s.tone}`}>
                      <Icon size={18} className="text-ink-900" />
                    </span>
                    <div>
                      <div className="display text-[20px] leading-tight text-ink-900">{s.name}</div>
                      <div className="text-[12.5px] text-ink-500">{s.need}</div>
                    </div>
                    <span className="display ml-auto text-[28px] text-ink-300">{String(idx + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2.5">
                    <Mini label="Pay" value={s.pay} pillClass={payTone(s.pay)} />
                    <Mini label="Channel" value={s.channel} />
                    <Mini label="Confidence" value={s.conf} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Personas */}
      <section>
        <SectionHeader
          eyebrow="Personas"
          title="The two people in your head"
          right={<button className="btn-ghost text-[12.5px]"><Sparkles size={12} /> Generate another</button>}
        />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {_personas.map(p => (
            <div key={p.name} className="card relative overflow-hidden !p-7">
              <div className={`absolute -right-12 -top-12 h-44 w-44 rounded-full gradient-soft-${p.tone} opacity-60 blur-2xl`} />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <span className={`grid h-14 w-14 place-items-center rounded-2xl gradient-soft-${p.tone} display text-[24px] text-ink-900`}>
                    {p.initials}
                  </span>
                  <div className="leading-tight">
                    <div className="display text-[22px] text-ink-900">{p.name}</div>
                    <div className="text-[12.5px] text-ink-500">{p.title} · {p.role}</div>
                  </div>
                </div>
                <div className="mt-5 space-y-3 text-[14px]">
                  <Row label="Pain"    value={p.pain} />
                  <Row label="Trigger" value={p.trigger} />
                  <Row label="Offer"   value={p.offer} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interview qs + voice */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="!p-7">
          <SectionHeader
            eyebrow="Customer discovery"
            title="Ten questions to ask 10 people this week"
            right={<button className="btn-ghost text-[12.5px]"><MessageSquare size={12} /> Export script</button>}
          />
          <ol className="space-y-2.5">
            {_interviewQs.map((q, i) => (
              <li key={q} className="flex items-center gap-4 rounded-2xl bg-cream-50 px-4 py-3">
                <span className="display grid h-8 w-8 place-items-center rounded-full bg-white text-[15px] text-ink-900 shadow-soft">
                  {i + 1}
                </span>
                <span className="flex-1 text-[14px] text-ink-900">{q}</span>
                <button className="btn-ghost !py-1 !px-2.5 text-[11.5px]">Send <ArrowUpRight size={11} /></button>
              </li>
            ))}
          </ol>
        </Card>

        <VoiceCommandBlock
          commands={[
            'Find me a more niche audience.',
            'Focus only on B2B.',
            'Add Muslim professionals as the primary audience.',
          ]}
        />
      </div>
    </div>
  )
}

function Mini({ label, value, pillClass }) {
  return (
    <div>
      <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500">{label}</div>
      <div className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${pillClass || 'bg-cream-50 border-ink-100 text-ink-700'}`}>{value}</div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex gap-3">
      <div className="w-16 shrink-0 text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-500 pt-0.5">{label}</div>
      <div className="text-ink-900">{value}</div>
    </div>
  )
}
