"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

type School = {
  id: string
  name: string
  domain: string
  createdAt: string
  counts: {
    users: number
    students: number
    classes: number
    curriculumOfferings: number
    timetableEntries: number
  }
}

type Filter = "all" | "ready" | "attention"

function setupScore(school: School) {
  const checks = [
    school.counts.users > 0,
    school.counts.classes > 0,
    school.counts.curriculumOfferings > 0,
    school.counts.timetableEntries > 0,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()
}

function exportHealthReport(schools: School[]) {
  const rows = [["School", "Domain", "Readiness", "Users", "Learners", "Classes", "Curriculum offerings", "Timetable entries", "Created"]]
  for (const school of schools) rows.push([school.name, school.domain, `${setupScore(school)}%`, String(school.counts.users), String(school.counts.students), String(school.counts.classes), String(school.counts.curriculumOfferings), String(school.counts.timetableEntries), new Date(school.createdAt).toISOString().slice(0, 10)])
  const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `studentos-school-health-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function SchoolsDirectory({ schools }: { schools: School[] }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [sort, setSort] = useState<"recent" | "name" | "readiness">("recent")

  const filteredSchools = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return schools
      .filter((school) => !normalizedQuery || `${school.name} ${school.domain}`.toLowerCase().includes(normalizedQuery))
      .filter((school) => filter === "all" || (filter === "ready" ? setupScore(school) === 100 : setupScore(school) < 100))
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name)
        if (sort === "readiness") return setupScore(b) - setupScore(a)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }, [filter, query, schools, sort])

  const readyCount = schools.filter((school) => setupScore(school) === 100).length
  const attentionCount = schools.length - readyCount
  const totalLearners = schools.reduce((sum, school) => sum + school.counts.students, 0)
  const totalClasses = schools.reduce((sum, school) => sum + school.counts.classes, 0)

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="relative overflow-hidden rounded-[28px] bg-[#1c1c1e] px-7 py-9 text-white sm:px-10 sm:py-11">
        <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border-[36px] border-[#ffd02f]/20" />
        <div className="absolute -bottom-28 right-36 h-56 w-56 rounded-full bg-[#4262ff]/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[.2em] text-[#ffd02f]">Platform directory</p>
            <h1 className="text-4xl font-medium leading-[1.05] tracking-[-.055em] sm:text-6xl">Know every school at a glance.</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#c7cad5]">Provision new schools, monitor onboarding health, and keep the platform ready without opening learner or staff records.</p>
          </div>
          <div className="flex flex-wrap gap-3"><button type="button" onClick={() => exportHealthReport(schools)} className="miro-pill inline-flex items-center justify-center bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20">Export health CSV</button><Link href="/dashboard/schools/new" className="miro-pill inline-flex items-center justify-center bg-[#ffd02f] px-5 py-3 text-sm font-semibold text-[#1c1c1e] transition hover:bg-[#ffe477]">Add a school <span className="ml-2 text-lg">+</span></Link></div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[20px] bg-[#e7edff] p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#4262ff]">Schools</p><p className="mt-4 font-mono text-4xl font-medium text-[#4262ff]">{schools.length}</p><p className="mt-2 text-xs text-[#555a6a]">Registered platforms</p></div>
        <div className="rounded-[20px] bg-[#c3faf5] p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#187574]">Ready</p><p className="mt-4 font-mono text-4xl font-medium text-[#187574]">{readyCount}</p><p className="mt-2 text-xs text-[#555a6a]">All core setup checks complete</p></div>
        <div className="rounded-[20px] bg-[#fff4c4] p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#746019]">Attention</p><p className="mt-4 font-mono text-4xl font-medium text-[#746019]">{attentionCount}</p><p className="mt-2 text-xs text-[#555a6a]">Schools still onboarding</p></div>
        <div className="rounded-[20px] bg-[#f2e9ff] p-5"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#6f35c8]">Footprint</p><p className="mt-4 font-mono text-3xl font-medium text-[#6f35c8]">{totalLearners.toLocaleString()}</p><p className="mt-2 text-xs text-[#555a6a]">Learners · {totalClasses} classes</p></div>
      </section>

      <section className="miro-surface overflow-hidden">
        <div className="border-b border-[#eef0f3] px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Operations directory</p><h2 className="mt-2 text-2xl font-medium tracking-tight text-[#1c1c1e]">School portfolio</h2></div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative block"><span className="sr-only">Search schools</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search schools or domains" className="w-full rounded-xl border border-[#e0e2e8] bg-[#fafbfc] px-4 py-2.5 text-sm outline-none transition placeholder:text-[#a5a8b5] focus:border-[#4262ff] focus:bg-white sm:w-64" /></label>
              <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="rounded-xl border border-[#e0e2e8] bg-white px-3 py-2.5 text-sm text-[#555a6a] outline-none focus:border-[#4262ff]"><option value="recent">Newest first</option><option value="name">Name A–Z</option><option value="readiness">Readiness first</option></select>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {([['all', `All schools · ${schools.length}`], ['attention', `Needs attention · ${attentionCount}`], ['ready', `Ready · ${readyCount}`]] as [Filter, string][]).map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`miro-pill px-3.5 py-2 text-xs font-semibold transition ${filter === value ? "bg-[#1c1c1e] text-white" : "bg-[#f7f8fa] text-[#6b6f7e] hover:bg-[#eef0f3]"}`}>{label}</button>)}
            <span className="ml-auto text-xs text-[#8e91a0]">Showing {filteredSchools.length} of {schools.length}</span>
          </div>
        </div>

        <div className="hidden grid-cols-[minmax(240px,1.4fr)_minmax(180px,1fr)_repeat(3,90px)_130px_100px] gap-4 border-b border-[#eef0f3] bg-[#fafbfc] px-7 py-3 text-[10px] font-semibold uppercase tracking-[.16em] text-[#8e91a0] lg:grid"><span>School</span><span>Readiness</span><span>Users</span><span>Learners</span><span>Classes</span><span>Created</span><span /></div>
        {filteredSchools.length ? <div className="divide-y divide-[#eef0f3]">{filteredSchools.map((school) => { const score = setupScore(school); const ready = score === 100; return <div key={school.id} className="grid gap-4 px-5 py-5 transition hover:bg-[#fafbfc] lg:grid-cols-[minmax(240px,1.4fr)_minmax(180px,1fr)_repeat(3,90px)_130px_100px] lg:items-center lg:px-7">
          <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffd02f] text-sm font-bold text-[#1c1c1e]">{initials(school.name)}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#1c1c1e]">{school.name}</p><p className="mt-1 truncate text-xs text-[#8e91a0]">{school.domain}</p></div></div>
          <div><div className="flex items-center justify-between gap-3 lg:block"><span className={`miro-pill inline-flex px-2.5 py-1 text-[11px] font-semibold ${ready ? "bg-[#c3faf5] text-[#187574]" : "bg-[#fff4c4] text-[#746019]"}`}>{ready ? "Ready" : `${score}% ready`}</span><span className="text-xs text-[#8e91a0] lg:ml-2">{school.counts.curriculumOfferings ? "Core curriculum" : "Curriculum needed"}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eef0f3]"><div className={`h-full rounded-full ${ready ? "bg-[#62c6bc]" : "bg-[#ffd02f]"}`} style={{ width: `${score}%` }} /></div></div>
          <div className="text-sm text-[#555a6a]"><span className="mr-2 text-xs text-[#8e91a0] lg:hidden">Users</span>{school.counts.users}</div><div className="text-sm text-[#555a6a]"><span className="mr-2 text-xs text-[#8e91a0] lg:hidden">Learners</span>{school.counts.students}</div><div className="text-sm text-[#555a6a]"><span className="mr-2 text-xs text-[#8e91a0] lg:hidden">Classes</span>{school.counts.classes}</div><div className="text-sm text-[#6b6f7e]">{new Date(school.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div><Link href={`/dashboard/schools/${school.id}`} className="text-sm font-semibold text-[#4262ff] hover:text-[#1c1c1e]">Manage →</Link>
        </div> })}</div> : <div className="px-6 py-16 text-center"><p className="text-lg font-medium text-[#1c1c1e]">No schools match this view.</p><p className="mt-2 text-sm text-[#8e91a0]">Try a different search or filter.</p></div>}
      </section>
    </div>
  )
}
