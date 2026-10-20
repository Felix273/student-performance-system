"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import Link from "next/link"

type Item = {
  id: string
  status: string
  numericScore: number | null
  masteryLevel: string | null
  narrative: string | null
  updatedAt: string
  student: { name: string; admissionNo: string; class: { id: string; name: string } }
  assessmentPlan: { title: string; date: string | null } | null
  component: { name: string } | null
  learningOutcome: { code: string; statement: string } | null
  competency: { code: string; name: string } | null
}

type SchoolClass = { id: string; name: string; grade: string }

const CANNED_REASONS = [
  "Numeric score does not correlate with the selected mastery band.",
  "Learner evidence narrative is missing or insufficient.",
  "Incorrect learning outcome tagged for this task.",
  "Rubric criteria levels need revision.",
]

export default function ModerationPage() {
  const [items, setItems] = useState<Item[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [status, setStatus] = useState("SUBMITTED")
  const [classFilter, setClassFilter] = useState("ALL")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  // In-app Modal state for Return/Reject
  const [modal, setModal] = useState<{
    isOpen: boolean
    evidenceId: string
    decision: "RETURNED" | "REJECTED"
    reason: string
  }>({
    isOpen: false,
    evidenceId: "",
    decision: "RETURNED",
    reason: "",
  })

  // Load classes for filtering
  useEffect(() => {
    fetch("/api/classes")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setClasses(Array.isArray(data) ? data : data.classes || []))
      .catch(() => {})
  }, [])

  // Load evidence items
  const load = useCallback(async () => {
    setLoading(true)
    setSelectedIds(new Set())
    try {
      const url = new URL("/api/moderation/evidence", window.location.origin)
      if (status !== "ALL") url.searchParams.set("status", status)
      if (classFilter !== "ALL") url.searchParams.set("classId", classFilter)

      const response = await fetch(url.toString(), { cache: "no-store" })
      const data = await response.json()
      setItems(data.items || [])
    } catch {
      setMessage("Failed to load moderation items.")
    } finally {
      setLoading(false)
    }
  }, [status, classFilter])

  useEffect(() => {
    load()
  }, [load])

  // Single review action
  const act = async (id: string, action: "review" | "publish", decision?: string, customReason?: string) => {
    setBusy(id)
    setMessage("")
    try {
      const isReview = action === "review"
      const endpoint = isReview ? `/api/evidence/${id}/review` : `/api/evidence/${id}/publish`
      const payload = isReview ? { decision, reason: customReason } : { reason: customReason }

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage(data.error || "Action failed")
      } else {
        setMessage(data.message || "Done")
        await load()
      }
    } catch {
      setMessage("Failed to process action.")
    } finally {
      setBusy("")
    }
  }

  // Open modal for returning/rejecting
  const openDecisionModal = (id: string, decision: "RETURNED" | "REJECTED") => {
    setModal({
      isOpen: true,
      evidenceId: id,
      decision,
      reason: "",
    })
  }

  const submitModalDecision = async () => {
    if (!modal.reason.trim()) {
      alert("Please provide a reason so the teacher knows what to correct.")
      return
    }
    const { evidenceId, decision, reason } = modal
    setModal({ isOpen: false, evidenceId: "", decision: "RETURNED", reason: "" })
    await act(evidenceId, "review", decision, reason)
  }

  // Batch actions
  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const batchVerify = async () => {
    if (!window.confirm(`Verify ${selectedIds.size} selected assessments?`)) return
    setBusy("BATCH")
    setMessage("")
    let succeeded = 0
    for (const id of Array.from(selectedIds)) {
      try {
        const res = await fetch(`/api/evidence/${id}/review`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision: "VERIFIED" }),
        })
        if (res.ok) succeeded++
      } catch {}
    }
    setMessage(`Successfully verified ${succeeded} evidence records.`)
    setBusy("")
    await load()
  }

  const batchPublish = async () => {
    if (!window.confirm(`Publish ${selectedIds.size} verified assessments to parent portals?`)) return
    setBusy("BATCH")
    setMessage("")
    let succeeded = 0
    for (const id of Array.from(selectedIds)) {
      try {
        const res = await fetch(`/api/evidence/${id}/publish`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        })
        if (res.ok) succeeded++
      } catch {}
    }
    setMessage(`Successfully published ${succeeded} results to parent portals.`)
    setBusy("")
    await load()
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <header className="flex flex-col gap-4 border-b border-[#e0e2e8] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#8c7318]">
            Assessment Operations & Quality Control
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight text-[#1c1c1e] sm:text-4xl">
            Moderation Queue
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6b6f7e]">
            Review, calibrate, and verify teacher marks before they become official, parent-visible report cards.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded-full border border-[#dfe3ea] bg-white px-4 py-2.5 text-xs font-semibold text-[#1c1c1e] outline-none"
          >
            <option value="ALL">All Classes & Streams</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (Grade {c.grade})
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-full border border-[#dfe3ea] bg-white px-4 py-2.5 text-xs font-semibold text-[#1c1c1e] outline-none"
          >
            <option value="SUBMITTED">Awaiting Review</option>
            <option value="VERIFIED">Verified (Ready to Publish)</option>
            <option value="PUBLISHED">Published to Parents</option>
            <option value="RETURNED">Returned for Correction</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All Statuses</option>
          </select>
        </div>
      </header>

      {/* Batch Action Toolbar */}
      {items.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#e0e2e8] bg-[#f7f8fa] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="select-all"
              checked={selectedIds.size > 0 && selectedIds.size === items.length}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-gray-300 accent-[#1c1c1e]"
            />
            <label htmlFor="select-all" className="cursor-pointer text-xs font-semibold text-[#1c1c1e]">
              {selectedIds.size > 0 ? `${selectedIds.size} of ${items.length} selected` : "Select All in view"}
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {status === "SUBMITTED" && selectedIds.size > 0 && (
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={batchVerify}
                className="miro-pill bg-[#1c1c1e] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2c2c34] disabled:opacity-50"
              >
                {busy === "BATCH" ? "Verifying…" : `✓ Batch Verify (${selectedIds.size})`}
              </button>
            )}

            {status === "VERIFIED" && selectedIds.size > 0 && (
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={batchPublish}
                className="miro-pill bg-[#ffd02f] px-4 py-2 text-xs font-bold text-[#1c1c1e] transition hover:bg-[#fcb900] disabled:opacity-50"
              >
                {busy === "BATCH" ? "Publishing…" : `🚀 Batch Publish to Parents (${selectedIds.size})`}
              </button>
            )}
          </div>
        </div>
      )}

      {message && (
        <div role="status" className="rounded-2xl bg-[#e7edff] px-5 py-4 text-sm font-semibold text-[#4c5fa8]">
          {message}
        </div>
      )}

      {/* Items List */}
      <section className="space-y-3">
        {loading ? (
          <p className="p-8 text-center text-sm text-[#6b6f7e]">Loading moderation queue…</p>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#cfd5df] bg-[#fffdf5] px-6 py-16 text-center">
            <h2 className="text-xl font-semibold text-[#1c1c1e]">Nothing needs your attention</h2>
            <p className="mt-2 text-sm text-[#6b6f7e]">
              {status === "SUBMITTED"
                ? "No teacher evidence is currently awaiting review. You're all caught up!"
                : `No evidence found with status ${status.toLowerCase()}.`}
            </p>
          </div>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className={`rounded-3xl border transition bg-white p-5 shadow-[0_8px_24px_rgba(28,28,30,.03)] ${
                selectedIds.has(item.id) ? "border-[#4262ff] ring-1 ring-[#4262ff]" : "border-[#e2e5eb]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 accent-[#1c1c1e]"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          item.status === "VERIFIED"
                            ? "bg-[#c3faf5] text-[#187574]"
                            : item.status === "PUBLISHED"
                            ? "bg-[#e7edff] text-[#4262ff]"
                            : item.status === "RETURNED"
                            ? "bg-[#fff4c4] text-[#746019]"
                            : item.status === "REJECTED"
                            ? "bg-[#ffe3e3] text-[#a33a3a]"
                            : "bg-[#ffd02f] text-[#1c1c1e]"
                        }`}
                      >
                        {item.status}
                      </span>
                      <span className="text-xs font-semibold text-[#8e91a0]">
                        {item.student.class?.name || "Unassigned"} · {item.student.admissionNo}
                      </span>
                    </div>
                    <h2 className="mt-2 text-xl font-semibold text-[#1c1c1e]">{item.student.name}</h2>
                    <p className="mt-0.5 text-xs text-[#6b6f7e]">
                      {item.assessmentPlan?.title || "Class Assessment"}
                      {item.component ? ` · ${item.component.name}` : ""}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  {item.numericScore !== null && (
                    <p className="font-mono text-base font-bold text-[#1c1c1e]">
                      Score: {item.numericScore}
                    </p>
                  )}
                  {item.masteryLevel && (
                    <p className="text-xs font-semibold text-[#4262ff]">
                      Band: {item.masteryLevel}
                    </p>
                  )}
                </div>
              </div>

              {/* Rubric and Outcomes Grid */}
              <div className="mt-4 grid gap-3 text-xs md:grid-cols-3">
                <div className="rounded-2xl bg-[#f5f7fb] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#8e91a0]">Learning Outcome</p>
                  <p className="mt-1 font-medium text-[#1c1c1e]">
                    {item.learningOutcome
                      ? `${item.learningOutcome.code} · ${item.learningOutcome.statement}`
                      : "Standard evaluation"}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f5f7fb] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#8e91a0]">Competency</p>
                  <p className="mt-1 font-medium text-[#1c1c1e]">
                    {item.competency ? `${item.competency.code} · ${item.competency.name}` : "General mastery"}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#fffdf0] p-3 border border-amber-100">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#8e91a0]">Teacher Narrative</p>
                  <p className="mt-1 font-medium text-[#746019]">
                    {item.narrative || "No qualitative narrative recorded."}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[#f0f2f5] pt-3">
                {item.status === "SUBMITTED" && (
                  <>
                    <button
                      disabled={busy === item.id}
                      onClick={() => act(item.id, "review", "VERIFIED")}
                      className="miro-pill bg-[#1c1c1e] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2c2c34] disabled:opacity-50"
                    >
                      Verify
                    </button>
                    <button
                      disabled={busy === item.id}
                      onClick={() => openDecisionModal(item.id, "RETURNED")}
                      className="miro-pill border border-[#1c1c1e] px-4 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                    >
                      Return for Correction
                    </button>
                    <button
                      disabled={busy === item.id}
                      onClick={() => openDecisionModal(item.id, "REJECTED")}
                      className="miro-pill border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}

                {item.status === "VERIFIED" && (
                  <button
                    disabled={busy === item.id}
                    onClick={() => act(item.id, "publish")}
                    className="miro-pill bg-[#ffd02f] px-4 py-2 text-xs font-bold text-[#1c1c1e] hover:bg-[#fcb900] disabled:opacity-50"
                  >
                    Publish to Parents
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </section>

      {/* Professional In-App Feedback Dialog */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-[#1c1c1e]">
              {modal.decision === "RETURNED" ? "Return Evidence to Teacher" : "Reject Evidence"}
            </h3>
            <p className="mt-1 text-xs text-[#6b6f7e]">
              Provide feedback so the teacher knows what needs to be revised before resubmission.
            </p>

            {/* Quick Canned Reasons */}
            <div className="mt-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e91a0]">
                Quick feedback templates
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {CANNED_REASONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setModal((prev) => ({ ...prev, reason: preset }))}
                    className="rounded-lg border border-[#e0e2e8] bg-[#f7f8fa] px-2.5 py-1 text-[11px] text-[#4f5664] hover:border-[#1c1c1e] hover:text-[#1c1c1e]"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Text Area */}
            <label className="mt-4 block">
              <span className="text-xs font-semibold text-[#4f5664]">
                Moderator note to teacher <span className="text-red-500">*</span>
              </span>
              <textarea
                required
                rows={3}
                value={modal.reason}
                onChange={(e) => setModal((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Explain what needs adjustment…"
                className="mt-1.5 w-full rounded-xl border border-[#e0e2e8] p-3 text-xs outline-none focus:border-[#4262ff]"
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal({ isOpen: false, evidenceId: "", decision: "RETURNED", reason: "" })}
                className="miro-pill border border-[#e0e2e8] px-4 py-2 text-xs font-semibold text-[#6b6f7e]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitModalDecision}
                className="miro-pill bg-[#1c1c1e] px-4 py-2 text-xs font-semibold text-white"
              >
                Submit Decision →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
