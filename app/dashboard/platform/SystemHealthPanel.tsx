type Health = { database: boolean; email: boolean; ai: boolean; version: string; deployment: string }

export default function SystemHealthPanel({ health }: { health: Health }) {
  const items = [
    { label: "Database", ok: health.database, detail: health.database ? "Connection available" : "Connection check failed" },
    { label: "Email", ok: health.email, detail: health.email ? "Provider configuration present" : "Not configured" },
    { label: "AI analysis", ok: health.ai, detail: health.ai ? "API key configured" : "Not configured" },
  ]
  return (
    <section className="miro-surface p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#8e91a0]">System health</p><h2 className="mt-2 text-xl font-medium">Service checks</h2></div><span className="text-xs font-medium text-[#8e91a0]">Configuration only</span></div>
      <div className="mt-5 divide-y divide-[#eef0f3]">
        {items.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-[#1c1c1e]">{item.label}</p><p className="mt-1 text-xs text-[#8e91a0]">{item.detail}</p></div><span className={`h-2.5 w-2.5 rounded-full ${item.ok ? "bg-[#2db88c]" : "bg-[#d6a32c]"}`} aria-label={item.ok ? "Configured" : "Not configured"} /></div>)}
      </div>
      <div className="mt-4 border-t border-[#eef0f3] pt-4 text-xs text-[#6b6f7e]"><p>Version <code className="font-mono font-semibold text-[#1c1c1e]">{health.version}</code></p><p className="mt-1">Deployment <code className="font-mono">{health.deployment}</code></p></div>
    </section>
  )
}