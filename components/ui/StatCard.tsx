import Link from "next/link"

interface StatCardProps { title: string; value: string | number; icon?: string; color?: "blue" | "green" | "purple" | "orange" | "red" | "indigo"; href?: string; trend?: { value: number; isPositive: boolean } }

const surfaces = { blue: "bg-[#e7edff]", green: "bg-[#c3faf5]", purple: "bg-[#f2e9ff]", orange: "bg-[#fff4c4]", red: "bg-[#ffc6c6]", indigo: "bg-[#ffd8f4]" }
const ink = { blue: "text-[#4262ff]", green: "text-[#187574]", purple: "text-[#6f35c8]", orange: "text-[#746019]", red: "text-[#600000]", indigo: "text-[#6f35c8]" }
export default function StatCard({ title, value, color = "blue", href, trend }: StatCardProps) {
  const content = <div className={`group min-h-36 rounded-[20px] p-5 transition hover:-translate-y-1 ${surfaces[color]}`}><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#555a6a]">{title}</p><p className={`mt-5 font-mono text-4xl font-medium tracking-[-.06em] ${ink[color]}`}>{value}</p>{trend && <p className={`mt-2 text-xs font-medium ${trend.isPositive ? "text-[#187574]" : "text-[#600000]"}`}>{trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% <span className="text-[#8e91a0]">vs last month</span></p>}</div>
  return href ? <Link href={href} className="block">{content}</Link> : content
}
