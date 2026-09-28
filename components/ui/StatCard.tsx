import Link from "next/link"

interface StatCardProps {
  title: string
  value: string | number
  icon?: string
  color?: "blue" | "green" | "purple" | "orange" | "red" | "indigo"
  href?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

export default function StatCard({ title, value, icon, color = "blue", href, trend }: StatCardProps) {
  const colorStyles = {
    blue: {
      text: "text-blue-600",
      bg: "bg-blue-50/80 border-blue-100",
      iconBg: "bg-blue-100 text-blue-700"
    },
    green: {
      text: "text-emerald-600",
      bg: "bg-emerald-50/80 border-emerald-100",
      iconBg: "bg-emerald-100 text-emerald-700"
    },
    purple: {
      text: "text-purple-600",
      bg: "bg-purple-50/80 border-purple-100",
      iconBg: "bg-purple-100 text-purple-700"
    },
    orange: {
      text: "text-amber-600",
      bg: "bg-amber-50/80 border-amber-100",
      iconBg: "bg-amber-100 text-amber-700"
    },
    red: {
      text: "text-rose-600",
      bg: "bg-rose-50/80 border-rose-100",
      iconBg: "bg-rose-100 text-rose-700"
    },
    indigo: {
      text: "text-indigo-600",
      bg: "bg-indigo-50/80 border-indigo-100",
      iconBg: "bg-indigo-100 text-indigo-700"
    }
  }

  const selectedColor = colorStyles[color] || colorStyles.blue

  const content = (
    <div className="group relative bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 h-full flex flex-col justify-between overflow-hidden">
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-bold tracking-wider uppercase text-slate-500 group-hover:text-slate-800 transition-colors">
          {title}
        </span>
        {icon && (
          <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-2xs transition-transform group-hover:scale-110 ${selectedColor.iconBg}`}>
            {icon}
          </span>
        )}
      </div>

      <div>
        <div className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${selectedColor.text}`}>
          {value}
        </div>

        {trend && (
          <div className={`text-xs mt-2.5 flex items-center gap-1 font-semibold ${
            trend.isPositive ? "text-emerald-600" : "text-rose-600"
          }`}>
            <span className="text-sm">{trend.isPositive ? "↑" : "↓"}</span>
            <span>{Math.abs(trend.value)}%</span>
            <span className="text-slate-400 font-normal">vs last month</span>
          </div>
        )}
      </div>
    </div>
  )

  if (href) {
    return <Link href={href} className="block h-full">{content}</Link>
  }

  return content
}
