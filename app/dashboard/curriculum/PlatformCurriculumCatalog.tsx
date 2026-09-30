"use client"

import { useEffect, useMemo, useState } from "react"

type Curriculum = { id: string; code: string; name: string; versions: { id: string; version: string; status: string }[] }
type Node = { id: string; parentId: string | null; code: string; title: string; nodeType: string; outcomes: { id: string; code: string; statement: string; isAssessable: boolean }[]; competencies: { competency: { code: string; name: string } }[] }

export default function PlatformCurriculumCatalog({ curricula }: { curricula: Curriculum[] }) {
  const firstVersion = curricula.flatMap((curriculum) => curriculum.versions).find((version) => version.status === "PUBLISHED") || curricula[0]?.versions[0]
  const [versionId, setVersionId] = useState(firstVersion?.id || "")
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!versionId) { setNodes([]); return }
    let cancelled = false
    setLoading(true)
    setError("")
    fetch(`/api/curriculum/tree?versionId=${encodeURIComponent(versionId)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "Unable to load curriculum map")
        if (!cancelled) setNodes(result.nodes || [])
      })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load curriculum map") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [versionId])

  const roots = useMemo(() => nodes.filter((node) => !node.parentId), [nodes])
  const childrenOf = (parentId: string) => nodes.filter((node) => node.parentId === parentId)
  const selectedCurriculum = curricula.find((curriculum) => curriculum.versions.some((version) => version.id === versionId))

  return <div className="space-y-10 animate-fade-in">
    <section className="relative overflow-hidden rounded-[28px] bg-[#ffd02f] px-7 py-10 sm:px-12 sm:py-14">
      <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full border-[32px] border-[#fcb900]/50" />
      <div className="relative max-w-3xl">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[.2em] text-[#746019]">Platform catalogue</p>
        <h1 className="text-4xl font-medium leading-[1.05] tracking-[-.055em] sm:text-6xl">Shared learning frameworks.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[#746019]">Browse the global curriculum catalogue and its learning outcomes. School offerings, class assignments, and adoption records are not available in this view.</p>
      </div>
    </section>

    <section className="grid gap-4 lg:grid-cols-[.75fr_1.25fr]">
      <div className="miro-surface p-6 sm:p-8">
        <div className="mb-6"><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Global frameworks</p><h2 className="mt-2 text-2xl font-medium tracking-tight text-[#1c1c1e]">Curriculum catalogue</h2><p className="mt-2 text-sm text-[#6b6f7e]">{curricula.length} framework{curricula.length === 1 ? "" : "s"}; versions shown without school adoption details.</p></div>
        {curricula.length ? <div className="space-y-3">{curricula.map((curriculum) => <article key={curriculum.id} className="rounded-2xl border border-[#e0e2e8] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-[#1c1c1e]">{curriculum.name}</h3><p className="mt-1 font-mono text-xs text-[#8e91a0]">{curriculum.code}</p></div><span className="miro-pill bg-[#f7f8fa] px-2.5 py-1 text-[10px] font-semibold text-[#555a6a]">{curriculum.versions.length} version{curriculum.versions.length === 1 ? "" : "s"}</span></div><div className="mt-4 flex flex-wrap gap-2">{curriculum.versions.map((version) => <button key={version.id} type="button" onClick={() => setVersionId(version.id)} aria-pressed={versionId === version.id} className={`miro-pill px-3 py-1.5 text-xs font-medium transition ${versionId === version.id ? "bg-[#1c1c1e] text-white" : "border border-[#e0e2e8] bg-white text-[#555a6a] hover:bg-[#f7f8fa]"}`}>{version.version} · {version.status.toLowerCase()}</button>)}</div></article>)}</div> : <p className="rounded-2xl bg-[#fff4c4] p-4 text-sm text-[#746019]">No global curriculum frameworks are available.</p>}
      </div>

      <div className="miro-surface p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Learning map</p><h2 className="mt-2 text-2xl font-medium tracking-tight text-[#1c1c1e]">{selectedCurriculum?.name || "Select a version"}</h2></div><label className="sr-only" htmlFor="curriculum-version">Curriculum version</label><select id="curriculum-version" className="rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 text-sm" value={versionId} onChange={(event) => setVersionId(event.target.value)}><option value="">Select version</option>{curricula.flatMap((curriculum) => curriculum.versions.map((version) => <option key={version.id} value={version.id}>{curriculum.code} · {version.version} · {version.status}</option>))}</select></div>
        {error ? <div role="alert" className="rounded-2xl border border-[#ffc6c6] bg-[#fff5f5] p-4 text-sm text-[#600000]">{error}</div> : !versionId ? <div className="rounded-2xl bg-[#e7edff] p-6 text-sm text-[#4c5fa8]">Select a curriculum version to browse its learning map.</div> : loading ? <div role="status" className="rounded-2xl bg-[#f4f5f7] p-6 text-sm text-[#6b6f7e]">Loading learning map…</div> : roots.length ? <div className="space-y-3">{roots.map((root) => <NodeCard key={root.id} node={root} childrenOf={childrenOf} depth={0} />)}</div> : <div className="rounded-2xl bg-[#fff4c4] p-6 text-sm text-[#746019]">This version has no curriculum nodes yet.</div>}
      </div>
    </section>
  </div>
}

function NodeCard({ node, childrenOf, depth }: { node: Node; childrenOf: (id: string) => Node[]; depth: number }) {
  const children = childrenOf(node.id)
  return <article className={depth === 0 ? "rounded-2xl bg-[#f4f5f7] p-4" : "mt-3 border-l-2 border-[#e0e2e8] pl-4"}><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8e91a0]">{node.nodeType.replaceAll("_", " ")} · {node.code}</span><h3 className="mt-1 text-base font-semibold">{node.title}</h3></div>{node.outcomes.length > 0 && <span className="rounded-full bg-[#ffd8f4] px-2.5 py-1 text-[10px] font-bold">{node.outcomes.length} outcomes</span>}</div>{node.competencies.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{node.competencies.map((item) => <span key={item.competency.code} className="rounded-full bg-[#c3faf5] px-2.5 py-1 text-[10px] font-medium">{item.competency.name}</span>)}</div>}{node.outcomes.map((outcome) => <div key={outcome.id} className="mt-3 rounded-xl bg-white p-3 text-sm text-[#555a6a]"><span className="mr-2 font-mono text-xs text-[#8e91a0]">{outcome.code}</span>{outcome.statement}</div>)}{children.map((child) => <NodeCard key={child.id} node={child} childrenOf={childrenOf} depth={depth + 1} />)}</article>
}
