import Link from "next/link"

interface StatCardProps { title: string; value: string | number; icon?: string; color?: "blue" | "green" | "purple" | "orange" | "red" | "indigo"; href?: string; trend?: { value: number; isPositive: boolean } }

const accents = { blue: "bg-blue-50 text-blue-600 ring-blue-100", green: "bg-emerald-50 text-emerald-600 ring-emerald-100", purple: "bg-violet-50 text-violet-600 ring-violet-100", orange: "bg-amber-50 text-amber-600 ring-amber-100", red: "bg-rose-50 text-rose-600 ring-rose-100", indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100" }

export default function StatCard({ title, value, icon, color = "blue", href, trend }: StatCardProps) {
  const content = <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.04)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgb(15,23,42,0.08)] sm:p-6"><div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-slate-50" /><div className="relative flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{title}</p><p className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{value}</p>{trend && <p className={`mt-3 text-xs font-bold ${trend.isPositive ? "text-emerald-600" : "text-rose-600"}`}>{trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% <span className="font-medium text-slate-400">vs last month</span></p>}</div>{icon && <span className={`relative flex h-11 w-11 items-center justify-center rounded-xl text-xl ring-1 ${accents[color]}`}>{icon}</span>}</div></div>
  return href ? <Link href={href} className="block">{content}</Link> : content
}
