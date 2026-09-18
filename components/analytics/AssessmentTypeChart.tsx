"use client"

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } from 'recharts'

interface AssessmentTypeData {
  type: string
  score: number
  maxScore: number
}

interface Props {
  data: AssessmentTypeData[]
}

export default function AssessmentTypeChart({ data }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Performance by Assessment Type
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="type" />
          <PolarRadiusAxis angle={90} domain={[0, 100]} />
          <Radar 
            name="Score %" 
            dataKey="score" 
            stroke="#8b5cf6" 
            fill="#8b5cf6" 
            fillOpacity={0.6} 
          />
          <Legend />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
