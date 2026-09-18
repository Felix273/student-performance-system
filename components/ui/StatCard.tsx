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
  const colorClasses = {
    blue: "text-blue-600",
    green: "text-green-600",
    purple: "text-purple-600",
    orange: "text-orange-600",
    red: "text-red-600",
    indigo: "text-indigo-600"
  }

  const content = (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 h-full">
      <div className="flex justify-between items-start mb-2">
        <div className="text-sm font-bold text-gray-800">{title}</div>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className={`text-3xl font-bold ${colorClasses[color]} mt-2`}>
        {value}
      </div>
      {trend && (
        <div className={`text-sm mt-2 flex items-center gap-1 font-semibold ${
          trend.isPositive ? "text-green-700" : "text-red-700"
        }`}>
          <span>{trend.isPositive ? "↑" : "↓"}</span>
          <span>{Math.abs(trend.value)}%</span>
          <span className="text-gray-700">vs last month</span>
        </div>
      )}
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
