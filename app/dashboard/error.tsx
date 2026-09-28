"use client"

import { useEffect } from "react"

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return <div className="flex min-h-[620px] items-center justify-center"><div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_16px_50px_rgb(15,23,42,0.08)]"><div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-2xl text-rose-600">!</div><p className="text-xs font-bold uppercase tracking-[.16em] text-rose-600">Something went wrong</p><h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">We couldn’t load this view</h2><p className="mt-3 text-sm leading-6 text-slate-500">Your data is safe. Try refreshing the workspace, and contact an administrator if the problem continues.</p><button onClick={reset} className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-600">Refresh workspace</button></div></div>
}
