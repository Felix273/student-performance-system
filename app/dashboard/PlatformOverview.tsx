import Link from "next/link"

type PlatformOverviewProps = {
  schoolCount: number
  learnerCount: number
  staffCount: number
  publishedCurriculumCount: number
}

const metricStyles = [
  { tint: "bg-[#fff4c4]", label: "Platform footprint" },
  { tint: "bg-[#e7edff]", label: "Learning community" },
  { tint: "bg-[#c3faf5]", label: "School workforce" },
  { tint: "bg-[#ffd8f4]", label: "Shared curriculum" },
]

export default function PlatformOverview({ schoolCount, learnerCount, staffCount, publishedCurriculumCount }: PlatformOverviewProps) {
  const metrics = [
    { title: "School workspaces", value: schoolCount, note: "Aggregate count only" },
    { title: "Learner records", value: learnerCount, note: "Platform-wide total" },
    { title: "School staff accounts", value: staffCount, note: "Platform-wide total" },
    { title: "Published curriculum versions", value: publishedCurriculumCount, note: "Global catalogue" },
  ]

  return <div className="space-y-10 animate-fade-in">
    <section className="relative overflow-hidden rounded-[28px] bg-[#ffd02f] px-7 py-10 sm:px-12 sm:py-14">
      <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full border-[32px] border-[#fcb900]/50" />
      <div className="relative max-w-3xl">
        <p className="mb-5 text-[11px] font-bold uppercase tracking-[.2em] text-[#746019]">Platform operations</p>
        <h1 className="max-w-2xl text-4xl font-medium leading-[1.05] tracking-[-.055em] text-[#1c1c1e] sm:text-6xl">A clear view of the platform.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[#746019]">Review platform-wide adoption and shared learning content. School identities and school-level records are deliberately outside this workspace.</p>
        <Link href="/dashboard/curriculum" className="miro-pill mt-8 inline-flex bg-[#1c1c1e] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#2c2c34]">Open curriculum catalogue <span className="ml-2 text-[#ffd02f]">↗</span></Link>
      </div>
    </section>

    <section aria-labelledby="platform-metrics-title">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Platform at a glance</p><h2 id="platform-metrics-title" className="mt-2 text-2xl font-medium tracking-tight text-[#1c1c1e]">Aggregate metrics</h2></div>
        <span className="miro-pill border border-[#e0e2e8] px-3 py-1.5 text-xs font-medium text-[#6b6f7e]">No school-level breakdowns</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => <article key={metric.title} className={`rounded-[20px] p-5 ${metricStyles[index].tint}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#555a6a]">{metricStyles[index].label}</p>
          <h3 className="mt-5 text-sm font-medium text-[#555a6a]">{metric.title}</h3>
          <p className="mt-2 font-mono text-4xl font-medium tracking-tight text-[#1c1c1e]">{metric.value.toLocaleString()}</p>
          <p className="mt-2 text-xs text-[#6b6f7e]">{metric.note}</p>
        </article>)}
      </div>
    </section>

    <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
      <div className="miro-surface p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Access scope</p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight text-[#1c1c1e]">Platform-wide, not school-by-school.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b6f7e]">This role can review aggregate totals and the shared curriculum catalogue. Individual school profiles, learner and staff records, results, finances, and operational activity remain restricted to the relevant school workspace.</p>
      </div>
      <div className="rounded-[20px] bg-[#1c1c1e] p-6 text-white sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#ffd02f]">Privacy boundary</p>
        <h2 className="mt-3 text-xl font-medium tracking-tight">Tenant details stay private.</h2>
        <p className="mt-3 text-sm leading-6 text-[#a5a8b5]">School identifiers and individual records are blocked in both the portal and its data APIs.</p>
      </div>
    </section>
  </div>
}
