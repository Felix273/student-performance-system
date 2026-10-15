"use client"

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { WeeklyPlatformMetric } from "@/lib/platform/metrics"

export default function OperationsTrendChart({ data }: { data: WeeklyPlatformMetric[] }) {
  return (
    <div className="h-[300px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: -18 }}>
          <CartesianGrid stroke="#e8ebef" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#777c87", fontSize: 11 }} />
          <YAxis yAxisId="activity" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#777c87", fontSize: 11 }} />
          <Tooltip contentStyle={{ border: "1px solid #e0e2e8", borderRadius: 10, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Bar yAxisId="activity" dataKey="schoolsCreated" name="Schools created" fill="#e5b51f" radius={[3, 3, 0, 0]} maxBarSize={24} />
          <Line yAxisId="activity" type="monotone" dataKey="activity" name="Platform actions" stroke="#187574" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}