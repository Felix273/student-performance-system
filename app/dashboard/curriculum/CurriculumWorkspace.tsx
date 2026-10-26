"use client"

import { useEffect, useMemo, useState } from "react"

type Curriculum = {
  id: string
  code: string
  name: string
  versions: { id: string; version: string; status: string }[]
}

type AcademicYear = { id: string; name: string; isCurrent: boolean }

type Offering = {
  id: string
  name: string
  code: string
  academicYearId?: string
  curriculum: { name: string; code: string }
  curriculumVersion: { id: string; version: string }
  academicYear: { id: string; name: string }
  grades: { id: string; gradeCode: string; displayName: string }[]
  _count: { assignments: number }
}

type SchoolClass = { id: string; name: string; grade: string }
type School = { id: string; name: string; domain: string }

type Node = {
  id: string
  parentId: string | null
  code: string
  title: string
  nodeType: string
  metadata?: {
    structureType?: string
    cluster?: string
    appliesToGrades?: string[]
    milestones?: { mainstream?: string; specialNeeds?: string; profile?: string }[]
  }
  outcomes: { id: string; code: string; statement: string; isAssessable: boolean }[]
  competencies: { competency: { code: string; name: string } }[]
}

function normaliseGrade(value: string) {
  return value.toUpperCase().replace(/GRADE|FORM|YEAR|LEVEL|[^A-Z0-9]/g, "").replace(/^G/, "")
}

function NodeCard({
  node,
  childrenOf,
  depth = 0,
}: {
  node: Node
  childrenOf: (parentId: string) => Node[]
  depth?: number
}) {
  const [open, setOpen] = useState(depth < 1)
  const children = childrenOf(node.id)

  return (
    <div className={`rounded-xl border border-[#e0e2e8] bg-white p-4 transition ${depth > 0 ? "ml-4" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[#187574] bg-[#c3faf5] px-2 py-0.5 rounded">
            {node.code}
          </span>
          <h4 className="font-semibold text-sm text-[#1c1c1e]">{node.title}</h4>
          <span className="text-[10px] text-slate-400 font-bold uppercase">{node.nodeType}</span>
        </div>
        {children.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="text-xs font-semibold text-[#4262ff] hover:underline"
          >
            {open ? "Collapse" : `Expand (${children.length})`}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          {node.outcomes?.length > 0 && (
            <div className="rounded-lg bg-[#f5f9f8] p-3 text-xs space-y-1">
              <span className="font-bold text-[10px] uppercase text-[#187574]">Assessable Learning Outcomes:</span>
              {node.outcomes.map((o) => (
                <p key={o.id} className="text-[#335452]">
                  <strong>{o.code}:</strong> {o.statement}
                </p>
              ))}
            </div>
          )}

          {children.map((child) => (
            <NodeCard key={child.id} node={child} childrenOf={childrenOf} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CurriculumWorkspace({
  curricula,
  academicYears,
  offerings,
  classes,
  schools,
  isSuperAdmin,
}: {
  curricula: Curriculum[]
  academicYears: AcademicYear[]
  offerings: Offering[]
  classes: SchoolClass[]
  schools: School[]
  isSuperAdmin: boolean
}) {
  const firstVersion =
    curricula.flatMap((c) => c.versions).find((v) => v.status === "PUBLISHED") || curricula[0]?.versions[0]
  const [versionId, setVersionId] = useState(firstVersion?.id || "")
  const [nodes, setNodes] = useState<Node[]>([])
  const [loadingTree, setLoadingTree] = useState(Boolean(firstVersion?.id))
  const [message, setMessage] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  const [form, setForm] = useState({
    name: "Kenya CBC 2026",
    code: "CBC_2026",
    curriculumVersionId: firstVersion?.id || "",
    academicYearId: academicYears.find((year) => year.isCurrent)?.id || academicYears[0]?.id || "",
    schoolId: schools[0]?.id || "",
  })

  // Initial assignment state
  const initialOffering = offerings[0]
  const initialClass = classes[0]
  const initialGrade =
    initialOffering?.grades.find(
      (g) => normaliseGrade(g.displayName) === normaliseGrade(initialClass?.grade || "")
    ) || initialOffering?.grades[0]

  const [assignment, setAssignment] = useState({
    classId: initialClass?.id || "",
    offeringId: initialOffering?.id || "",
    offeringGradeId: initialGrade?.id || "",
    academicYearId: initialOffering?.academicYear?.id || initialOffering?.academicYearId || academicYears[0]?.id || "",
    periodId: "",
  })

  const loadTree = (id: string) => {
    if (id === versionId) return
    setNodes([])
    setLoadingTree(true)
    setMessage("")
    setVersionId(id)
  }

  useEffect(() => {
    if (!versionId) {
      setLoadingTree(false)
      return
    }
    const controller = new AbortController()
    fetch(`/api/curriculum/tree?versionId=${encodeURIComponent(versionId)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "Unable to load tree")
        setNodes(result.nodes || [])
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Unable to load curriculum tree")
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingTree(false)
      })
    return () => controller.abort()
  }, [versionId])

  const roots = useMemo(() => nodes.filter((node) => !node.parentId), [nodes])
  const childrenOf = (parentId: string) => nodes.filter((node) => node.parentId === parentId)
  const selectedCurriculum = curricula.find((c) => c.versions.some((v) => v.id === versionId))
  const selectedOffering = offerings.find((offering) => offering.id === assignment.offeringId)

  // Handle Class Selection with Smart Grade Auto-Matching
  const handleClassChange = (selectedClassId: string) => {
    const cls = classes.find((c) => c.id === selectedClassId)
    const matchingGrade = selectedOffering?.grades.find(
      (g) => normaliseGrade(g.displayName) === normaliseGrade(cls?.grade || "")
    )

    setAssignment((prev) => ({
      ...prev,
      classId: selectedClassId,
      offeringGradeId: matchingGrade?.id || prev.offeringGradeId,
    }))
  }

  // Handle Offering Selection with Year Sync
  const handleOfferingChange = (selectedOfferingId: string) => {
    const off = offerings.find((o) => o.id === selectedOfferingId)
    const cls = classes.find((c) => c.id === assignment.classId)
    const matchingGrade = off?.grades.find(
      (g) => normaliseGrade(g.displayName) === normaliseGrade(cls?.grade || "")
    )

    setAssignment((prev) => ({
      ...prev,
      offeringId: selectedOfferingId,
      offeringGradeId: matchingGrade?.id || off?.grades[0]?.id || "",
      academicYearId: off?.academicYear?.id || off?.academicYearId || prev.academicYearId,
    }))
  }

  const createAssignment = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage("")
    setErrorMsg("")

    try {
      const response = await fetch("/api/curriculum/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignment),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Unable to assign class")
      }
      setMessage("✓ Class successfully bound to curriculum! Teachers can now assess against these standards.")
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Unable to assign class")
    }
  }

  const createOffering = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage("")
    setErrorMsg("")
    try {
      const response = await fetch("/api/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Unable to create offering")
      setMessage("✓ Curriculum offering created successfully. Refresh to view the updated configuration.")
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Unable to create offering")
    }
  }

  return (
    <div className="space-y-10 animate-fade-in">
      <section className="relative overflow-hidden rounded-[28px] bg-[#ffd02f] px-7 py-10 sm:px-12 sm:py-14">
        <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full border-[32px] border-[#fcb900]/50" />
        <div className="relative max-w-3xl">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[.2em] text-[#746019]">
            Curriculum Studio · Kenya CBC Standards
          </p>
          <h1 className="text-4xl font-medium leading-[1.05] tracking-[-.055em] text-[#1c1c1e] sm:text-6xl">
            One framework. Every stage.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#746019]">
            Explore the unified Pre-Primary to Senior School structure, including learning areas, strands, and assessable learning outcomes.
          </p>
        </div>
      </section>

      {message && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      )}

      {errorMsg && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800">
          {errorMsg}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <div className="space-y-6">
          {/* Form 1: Adopt Curriculum Offering */}
          <div className="miro-surface p-6 sm:p-8">
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Adopt Framework</p>
              <h2 className="mt-2 text-2xl font-medium tracking-tight text-[#1c1c1e]">School Curriculum Offering</h2>
            </div>
            <form onSubmit={createOffering} className="space-y-4">
              {isSuperAdmin && (
                <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
                  School
                  <select
                    required
                    className="mt-2 w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 text-sm"
                    value={form.schoolId}
                    onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
                  >
                    <option value="">Select school</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
                Curriculum Version
                <select
                  className="mt-2 w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 text-sm"
                  value={form.curriculumVersionId}
                  onChange={(e) => setForm({ ...form, curriculumVersionId: e.target.value })}
                >
                  {curricula.flatMap((c) =>
                    c.versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {c.name} · {v.version} ({v.status})
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
                Academic Year
                <select
                  className="mt-2 w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 text-sm"
                  value={form.academicYearId}
                  onChange={(e) => setForm({ ...form, academicYearId: e.target.value })}
                >
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name} {year.isCurrent ? "· (Current Active)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
                  Display Name
                  <input
                    className="mt-2 w-full rounded-xl border border-[#e0e2e8] px-4 py-3 text-sm"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
                  Code
                  <input
                    className="mt-2 w-full rounded-xl border border-[#e0e2e8] px-4 py-3 text-sm uppercase font-mono"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  />
                </label>
              </div>

              <button
                disabled={isSuperAdmin && !form.schoolId}
                className="miro-pill w-full bg-[#1c1c1e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2c2c34] disabled:opacity-50"
              >
                Adopt Curriculum Framework +
              </button>
            </form>
          </div>

          {/* Form 2: Assign Curriculum to Class */}
          <div className="miro-surface p-6 sm:p-8">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">Class Configuration</p>
              <h3 className="mt-2 text-xl font-bold text-[#1c1c1e]">Assign Pathway to Class</h3>
              <p className="mt-1 text-xs text-[#6b6f7e]">
                Teachers can only assess learning outcomes for classes bound to an active curriculum offering.
              </p>
            </div>

            <form onSubmit={createAssignment} className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
                Class / Stream
                <select
                  required
                  className="mt-1.5 w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 text-sm"
                  value={assignment.classId}
                  onChange={(e) => handleClassChange(e.target.value)}
                >
                  <option value="">Select class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} · Grade {cls.grade}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
                Curriculum Offering
                <select
                  required
                  className="mt-1.5 w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 text-sm"
                  value={assignment.offeringId}
                  onChange={(e) => handleOfferingChange(e.target.value)}
                >
                  <option value="">Select curriculum offering</option>
                  {offerings.map((offering) => (
                    <option key={offering.id} value={offering.id}>
                      {offering.name} ({offering.academicYear?.name || "Year"})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold uppercase tracking-wide text-[#6b6f7e]">
                Curriculum Grade
                <select
                  required
                  className="mt-1.5 w-full rounded-xl border border-[#e0e2e8] bg-white px-4 py-3 text-sm font-semibold"
                  value={assignment.offeringGradeId}
                  onChange={(e) => setAssignment({ ...assignment, offeringGradeId: e.target.value })}
                >
                  <option value="">Select curriculum grade</option>
                  {selectedOffering?.grades.map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {grade.displayName} ({grade.gradeCode})
                    </option>
                  ))}
                </select>
              </label>

              <button
                disabled={!classes.length || !offerings.length}
                className="miro-pill w-full bg-[#187574] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#135d5c] disabled:opacity-50"
              >
                Assign Class to Curriculum +
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Interactive Curriculum Tree Map */}
        <div className="miro-surface p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#eef0f3] pb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">Learning Hierarchy</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#1c1c1e]">
                {selectedCurriculum?.name || "Curriculum Map"}
              </h2>
            </div>
            <select
              aria-label="Curriculum version"
              className="rounded-xl border border-[#e0e2e8] bg-white px-4 py-2.5 text-xs font-semibold"
              value={versionId}
              onChange={(e) => loadTree(e.target.value)}
            >
              <option value="">Select version</option>
              {curricula.flatMap((c) =>
                c.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {c.code} · {v.version}
                  </option>
                ))
              )}
            </select>
          </div>

          {!versionId ? (
            <div className="rounded-2xl bg-[#e7edff] p-6 text-sm text-[#4c5fa8]">
              Select a curriculum version to browse its learning map.
            </div>
          ) : loadingTree ? (
            <div className="rounded-2xl bg-[#f4f5f7] p-8 text-center text-sm text-[#6b6f7e]">
              Loading learning outcomes and competency nodes…
            </div>
          ) : roots.length === 0 ? (
            <div className="rounded-2xl bg-[#fffdf5] border border-amber-200 p-8 text-center text-sm text-[#746019]">
              No curriculum nodes populated for this version.
            </div>
          ) : (
            <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
              {roots.map((root) => (
                <NodeCard key={root.id} node={root} childrenOf={childrenOf} depth={0} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
