import Link from "next/link"

interface StatCardProps { title: string; value: string | number; icon?: string; color?: "blue" | "green" | "purple" | "orange" | "red" | "indigo"; href?: string; trend?: { value: number; isPositive: boolean } }

const accents = { blue: "text-blue-600", green: "text-emerald-600", purple: "text-violet-600", orange: "text-amber-600", red: "text-rose-600", indigo: "text-indigo-600" }
export default function StatCard({ title, value, color = "blue", href, trend }: StatCardProps) {
  const content = <div className="group px-5 py-6 transition hover:bg-slate-50 sm:px-7"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">{title}</p><p className={`mt-3 font-mono text-4xl font-medium tracking-[-.06em] ${accents[color]}`}>{value}</p>{trend && <p className={`mt-2 text-xs font-semibold ${trend.isPositive ? "text-emerald-600" : "text-rose-600"}`}>{trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% <span className="font-normal text-slate-400">vs last month</span></p>}</div>
  return href ? <Link href={href} className="block">{content}</Link> : content
}
