"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface SubjectData {
  subject: string
  score: number
  classAverage: number
}

interface Props {
  data: SubjectData[]
}

export default function SubjectPerformanceChart({ data }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Performance by Subject
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="subject" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
            domain={[0, 100]}
          />
          <Tooltip />
          <Legend />
          <Bar dataKey="score" fill="#8b5cf6" name="Your Score" />
          <Bar dataKey="classAverage" fill="#ec4899" name="Class Average" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
