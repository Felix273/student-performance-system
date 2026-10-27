import { auth } from "@/lib/auth-config"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Client Onboarding & Pitch Deck | Fentech StudentOS",
}

export default async function ClientMaterialsPage() {
  const session = await auth()
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard")
  }

  const documents = [
    {
      id: "overview",
      filename: "StudentOS_School_Overview_and_Directives.pdf",
      title: "School Overview & Executive Directives",
      badge: "8 Pages · Executive Pitch Deck",
      kicker: "Strategic Blueprint for School Directors & Board Members",
      summary:
        "A clear, non-technical overview designed for school proprietors, boards of management, and headteachers. Explains why StudentOS eliminates spreadsheet chaos, fixes fee leakages, and automates Kenyan CBC reporting without overwhelming teachers.",
      takeaways: [
        "Unifies school administration, CBC assessments, lesson tracking, and parent communication into one role-aware workspace.",
        "Role Boundaries: School Admins manage setup; Teachers work with assigned classes; Parents see published updates, never drafts.",
        "Clear CBC Accountability: Two assessment paths in one learner record (traditional scores + competency-linked evidence).",
        "Recommended 5-step pilot rollout plan for smooth Term 1 adoption.",
      ],
      color: "bg-[#ffd02f]",
      accent: "border-[#ffd02f]",
    },
    {
      id: "workflow",
      filename: "StudentOS_School_Workflow_Walkthrough.pdf",
      title: "System Workflow & Implementation Walkthrough",
      badge: "10 Pages · Operational Guide",
      kicker: "Step-by-Step Practical Guide for Academic Staff",
      summary:
        "A hands-on operational guide walking staff through day-to-day school routines: setting up terms, taking attendance in seconds, capturing CBC competency evidence in class, reviewing submissions in the moderation queue, and printing official term report cards.",
      takeaways: [
        "Day 1 School Setup: Configuring terms, CBC learning areas, and mapping teachers to classes and streams.",
        "Lesson Workspace: How teachers mark roll-call, review KICD learning outcomes, and record in-class learner evidence.",
        "Assessment Moderation: Administrative review pipeline with batch verification and return-for-correction feedback.",
        "Finance & Reports: Logging M-Pesa receipts and generating official CBC PDF report cards with school crests.",
      ],
      color: "bg-[#c3faf5]",
      accent: "border-[#187574]",
    },
  ]

  const demoSteps = [
    { time: "0 – 2 min", step: "Start with School Leadership", detail: "Show the executive dashboard, active academic year/term badge, and live school metrics." },
    { time: "2 – 4 min", step: "Show a Class in Action", detail: "Open an assigned class, demonstrate 1-click morning attendance roll-call, and class coverage." },
    { time: "4 – 7 min", step: "In-Class Lesson Delivery", detail: "Launch a timetable slot to show official KICD learning outcomes and learner evidence tagging." },
    { time: "7 – 9 min", step: "Quality Sign-Off (Moderation)", detail: "Open the Moderation Queue to prove that teacher drafts remain private until approved." },
    { time: "9 – 11 min", step: "Family Communication & Fees", detail: "Demonstrate the Parent Portal with color-coded CBC badges (EE, ME, AE, BE) and live fee receipts." },
    { time: "11 – 12 min", step: "Instant Report Card Generation", detail: "Generate an official CBC Term Report Card complete with the school logo in under 2 seconds." },
  ]

  return (
    <div className="space-y-10 animate-fade-in pb-16 max-w-6xl mx-auto">
      {/* 1. Hero Header */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#ffd02f] p-7 sm:p-12 text-[#1c1c1e]">
        <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full border-[32px] border-[#fcb900]/50" />
        <div className="relative max-w-3xl">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[.2em] text-[#746019]">
            Client Onboarding & Leadership Resources
          </p>
          <h1 className="text-3xl font-medium tracking-tight sm:text-5xl">
            School Overview & Pitch Deck Hub
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#746019] max-w-2xl">
            Official executive presentations and workflow walkthroughs prepared for school directors, boards of management, and headteachers. Available in official PDF format for meetings and presentations.
          </p>
        </div>
      </section>

      {/* 2. Document Cards with Direct Downloads */}
      <section className="space-y-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">Official Publications</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#1c1c1e]">Executive Documentation</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="miro-surface p-6 sm:p-8 flex flex-col justify-between space-y-6 border border-[#e0e2e8] transition hover:border-[#1c1c1e]"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="miro-pill bg-[#1c1c1e] text-white px-3 py-1 text-[10px] font-bold">
                    {doc.badge}
                  </span>
                  <span className="text-xs font-mono text-slate-400">Official PDF</span>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#187574]">{doc.kicker}</p>
                  <h3 className="mt-1 text-xl font-bold text-[#1c1c1e]">{doc.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-[#555a6a]">{doc.summary}</p>
                </div>

                <div className="border-t border-[#eef0f3] pt-4 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e91a0]">
                    Key Executive Highlights:
                  </span>
                  <ul className="space-y-1.5 text-xs text-[#1c1c1e]">
                    {doc.takeaways.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#187574] font-bold mt-0.5">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-[#eef0f3]">
                <a
                  href={`/api/client-materials/${encodeURIComponent(doc.filename)}`}
                  download={doc.filename}
                  className="miro-pill inline-flex items-center gap-2 bg-[#1c1c1e] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#2c2c34] transition"
                >
                  <span>Download PDF</span>
                  <span>📥</span>
                </a>
                <a
                  href={`/api/client-materials/${encodeURIComponent(doc.filename)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="miro-pill inline-flex items-center gap-1.5 border border-[#e0e2e8] bg-white px-4 py-2.5 text-xs font-semibold text-[#1c1c1e] hover:bg-[#f7f8fa] transition"
                >
                  <span>View in Browser</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. The 12-Minute Guided School Demo Roadmap */}
      <section className="miro-surface p-6 sm:p-9 space-y-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[.18em] text-[#187574]">
            Client Pitch Playbook
          </span>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#1c1c1e]">
            The 12-Minute School Demonstration Guide
          </h2>
          <p className="mt-1.5 text-xs text-[#6b6f7e] max-w-2xl">
            When demonstrating Fentech StudentOS to a school board or proprietor, follow this role-based narrative rather than giving an exhausting tour of every menu.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {demoSteps.map((s, idx) => (
            <div key={idx} className="rounded-2xl border border-[#e0e2e8] bg-[#fbfbfc] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#4262ff] bg-[#e7edff] px-2 py-0.5 rounded">
                  {s.time}
                </span>
                <span className="text-[10px] font-bold text-slate-400">Step 0{idx + 1}</span>
              </div>
              <h4 className="font-bold text-sm text-[#1c1c1e]">{s.step}</h4>
              <p className="text-xs text-[#555a6a] leading-5">{s.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Why Schools Choose Fentech StudentOS (Departmental Breakdown) */}
      <section className="rounded-[24px] bg-[#1c1c1e] p-7 sm:p-10 text-white space-y-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[.2em] text-[#ffd02f]">
            Value Realization
          </span>
          <h2 className="mt-1 text-2xl font-medium tracking-tight sm:text-3xl">
            Why Every School Stakeholder Wins
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 pt-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2">
            <h4 className="font-bold text-sm text-[#ffd02f]">For School Directors</h4>
            <p className="text-xs leading-relaxed text-slate-300">
              Complete oversight of student enrollment, zero fee leakages with verified M-Pesa receipts, and compliance with the national curriculum.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2">
            <h4 className="font-bold text-sm text-[#c3faf5]">For Headteachers</h4>
            <p className="text-xs leading-relaxed text-slate-300">
              Assessment moderation queue ensures no unapproved scores reach parents. Class teacher coverage pulses prevent unmonitored streams.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2">
            <h4 className="font-bold text-sm text-[#b5c7ff]">For Teachers</h4>
            <p className="text-xs leading-relaxed text-slate-300">
              One unified Lesson Workspace: KICD outcomes, weekly timetable, 1-click morning roll-call, and rubric evidence capture in one place.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2">
            <h4 className="font-bold text-sm text-[#ffd8f4]">For Parents</h4>
            <p className="text-xs leading-relaxed text-slate-300">
              Clear, color-coded CBC mastery badges (EE, ME, AE, BE), instant fee statements, and 1-click official term report card downloads.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
