"use client"

import { useCallback, useRef, useState } from "react"
import { signIn } from "next-auth/react"

function ArrowUpRight() {
  return <span aria-hidden="true" className="text-base transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">↗</span>
}

function DotGrid() {
  return <div aria-hidden="true" className="pointer-events-none absolute right-8 top-8 grid grid-cols-6 gap-2 opacity-35 sm:right-14 sm:top-12">{Array.from({ length: 36 }).map((_, index) => <span key={index} className="h-1.5 w-1.5 rounded-full bg-[#1c1c1e]" />)}</div>
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const isSubmitting = useRef(false)

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting.current) return
    isSubmitting.current = true
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", { email, password, redirect: false })
      if (result?.error) {
        setError("We couldn’t sign you in. Check your email and password.")
        setLoading(false)
        isSubmitting.current = false
      } else if (result?.ok) {
        window.location.href = "/dashboard"
      }
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
      isSubmitting.current = false
    }
  }, [email, password])

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-[#1c1c1e]">
      <div className="mx-auto grid min-h-screen max-w-[1480px] lg:grid-cols-[1.12fr_.88fr]">
        <section className="relative flex min-h-[430px] flex-col justify-between overflow-hidden bg-[#ffd02f] px-6 py-7 sm:px-10 sm:py-9 lg:min-h-screen lg:px-14 lg:py-12 xl:px-20">
          <DotGrid />
          <div className="relative flex items-center justify-between">
            <a href="/login" className="group flex items-center gap-3" aria-label="StudentOS home">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1c1c1e] text-base font-black text-[#ffd02f] shadow-sm">S</span>
              <span><strong className="block text-[15px] font-bold tracking-tight">StudentOS</strong><small className="block text-[10px] font-semibold uppercase tracking-[.16em] text-[#746019]">School operations</small></span>
            </a>
            <span className="hidden rounded-full border border-[#1c1c1e]/15 bg-white/30 px-3 py-1.5 text-[11px] font-semibold text-[#746019] sm:block">Performance workspace</span>
          </div>

          <div className="relative my-12 max-w-2xl lg:my-0">
            <p className="mb-5 text-[11px] font-bold uppercase tracking-[.2em] text-[#746019]">A clearer way to move schools forward</p>
            <h1 className="max-w-xl text-5xl font-medium leading-[.98] tracking-[-.06em] sm:text-6xl xl:text-[5.4rem]">Make space for better decisions.</h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-[#746019] sm:text-lg">One calm workspace for student records, assessment intelligence, attendance, and the decisions that shape outcomes.</p>
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm font-semibold text-[#1c1c1e]">
              <span><strong className="mr-2 font-mono text-lg">01</strong> Understand</span>
              <span><strong className="mr-2 font-mono text-lg">02</strong> Act</span>
              <span><strong className="mr-2 font-mono text-lg">03</strong> Improve</span>
            </div>
          </div>

          <div className="relative flex items-end justify-between gap-5 text-xs font-medium text-[#746019]">
            <p>© 2026 StudentOS · Built for ambitious schools</p>
            <span aria-hidden="true" className="hidden h-16 w-16 rounded-full border-[10px] border-[#fcb900]/70 sm:block" />
          </div>
        </section>

        <section className="flex items-center justify-center bg-[#f7f8fa] px-5 py-10 sm:px-10 lg:px-14 xl:px-20">
          <div className="w-full max-w-[430px]">
            <div className="mb-7 lg:hidden"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffd02f] text-base font-black text-[#1c1c1e]">S</span></div>
            <div className="rounded-[28px] bg-white p-7 shadow-[0_18px_60px_rgba(28,28,30,.08)] sm:p-10">
              <div className="mb-8">
                <div className="mb-5 flex items-center justify-between"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8e91a0]">Welcome back</p><span className="h-2.5 w-2.5 rounded-full bg-[#2db88c]" title="Secure sign-in" /></div>
                <h2 className="text-3xl font-medium tracking-[-.045em] text-[#1c1c1e] sm:text-[2.15rem]">Sign in to your workspace</h2>
                <p className="mt-3 text-sm leading-6 text-[#6b6f7e]">Access your school’s performance command center.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
                <div>
                  <label htmlFor="email" className="mb-2 block text-[11px] font-bold uppercase tracking-[.12em] text-[#555a6a]">Email address</label>
                  <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" disabled={loading} placeholder="name@school.edu" className="w-full rounded-xl border border-[#e0e2e8] bg-[#f7f8fa] px-4 py-3.5 text-sm font-medium text-[#1c1c1e] outline-none transition placeholder:text-[#a5a8b5] focus:border-[#4262ff] focus:bg-white focus:ring-4 focus:ring-[#4262ff]/10 disabled:opacity-60" />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-[.12em] text-[#555a6a]">Password</label><span className="text-xs font-medium text-[#a5a8b5]">Secure access</span></div>
                  <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" disabled={loading} placeholder="Enter your password" className="w-full rounded-xl border border-[#e0e2e8] bg-[#f7f8fa] px-4 py-3.5 text-sm font-medium text-[#1c1c1e] outline-none transition placeholder:text-[#a5a8b5] focus:border-[#4262ff] focus:bg-white focus:ring-4 focus:ring-[#4262ff]/10 disabled:opacity-60" />
                </div>
                {error && <div role="alert" aria-live="polite" className="rounded-xl border border-[#ffc6c6] bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#9b3030]">{error}</div>}
                <button type="submit" disabled={loading} className="group flex w-full items-center justify-between rounded-full bg-[#1c1c1e] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(28,28,30,.16)] transition hover:bg-[#2c2c34] focus:outline-none focus:ring-4 focus:ring-[#4262ff]/20 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60"><span>{loading ? "Signing you in…" : "Continue to workspace"}</span><ArrowUpRight /></button>
              </form>

              <div className="mt-7 border-t border-[#eef0f3] pt-5 text-center text-xs font-medium leading-5 text-[#6b6f7e]">Need access? Contact your school administrator for an account or password reset.</div>
            </div>
            <p className="mt-5 text-center text-xs font-medium text-[#a5a8b5]">Your account is protected with encrypted sessions.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
