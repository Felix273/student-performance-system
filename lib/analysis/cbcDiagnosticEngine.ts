export type AssessmentInput = {
  subject: string
  title: string
  type?: string
  score: number
  maxScore: number
  percentage: number
}

export type QualitativeEvidenceInput = {
  outcome?: string | null
  competency?: string | null
  masteryLevel?: string | null
  narrative?: string | null
}

export type GeneratedInsight = {
  overallGrade: "EE" | "ME" | "AE" | "BE"
  trend: "IMPROVING" | "DECLINING" | "STABLE"
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  insights: string
}

export function generateLocalCbcInsights(
  studentName: string,
  assessments: AssessmentInput[],
  evidenceItems: QualitativeEvidenceInput[] = []
): GeneratedInsight {
  if (assessments.length === 0) {
    return {
      overallGrade: "ME",
      trend: "STABLE",
      strengths: ["Learner enrolled and ready for initial baseline assessment."],
      weaknesses: ["Insufficient assessment checkpoints recorded."],
      recommendations: ["Administer introductory term assessments to establish baseline competencies."],
      insights: `${studentName} is ready to begin formative evaluations. Baseline data will appear once the first assessments are recorded.`,
    }
  }

  // 1. Calculate Average Percentage
  const totalPct = assessments.reduce((sum, a) => sum + a.percentage, 0)
  const averagePct = totalPct / assessments.length

  // 2. Map to Official Kenya CBC Mastery Levels
  let overallGrade: "EE" | "ME" | "AE" | "BE" = "ME"
  if (averagePct >= 80) overallGrade = "EE"
  else if (averagePct >= 60) overallGrade = "ME"
  else if (averagePct >= 40) overallGrade = "AE"
  else overallGrade = "BE"

  // 3. Trajectory / Trend Analysis (First half vs. Second half)
  let trend: "IMPROVING" | "DECLINING" | "STABLE" = "STABLE"
  if (assessments.length >= 2) {
    const mid = Math.floor(assessments.length / 2)
    const early = assessments.slice(0, mid)
    const recent = assessments.slice(mid)

    const earlyAvg = early.reduce((s, a) => s + a.percentage, 0) / early.length
    const recentAvg = recent.reduce((s, a) => s + a.percentage, 0) / recent.length
    const delta = recentAvg - earlyAvg

    if (delta >= 4.0) trend = "IMPROVING"
    else if (delta <= -4.0) trend = "DECLINING"
    else trend = "STABLE"
  }

  // 4. Group by Subject Area
  const subjectMap = new Map<string, { total: number; count: number }>()
  for (const a of assessments) {
    const existing = subjectMap.get(a.subject) || { total: 0, count: 0 }
    existing.total += a.percentage
    existing.count++
    subjectMap.set(a.subject, existing)
  }

  const subjectAverages = Array.from(subjectMap.entries()).map(([subject, data]) => ({
    subject,
    avg: data.total / data.count,
  }))

  subjectAverages.sort((a, b) => b.avg - a.avg)

  const topSubjects = subjectAverages.filter((s) => s.avg >= 60).slice(0, 3)
  const needSupportSubjects = subjectAverages.filter((s) => s.avg < 60).slice(-3).reverse()

  // 5. Construct Contextual Strengths
  const strengths: string[] = []
  if (topSubjects.length > 0) {
    topSubjects.forEach((s) => {
      strengths.push(`Strong academic mastery in ${s.subject} (averaging ${s.avg.toFixed(0)}%).`)
    })
  } else {
    strengths.push("Consistent effort demonstrated across formative evaluation checkpoints.")
  }

  // Add qualitative evidence strengths if present
  const eeEvidence = evidenceItems.filter((e) => e.masteryLevel?.toUpperCase().includes("EE"))
  if (eeEvidence.length > 0 && eeEvidence[0].competency) {
    strengths.push(`Demonstrated advanced capability in ${eeEvidence[0].competency}.`)
  }
  if (strengths.length < 3) {
    strengths.push(
      trend === "IMPROVING"
        ? "Positive learning momentum showing upward score progression."
        : "Maintains steady engagement with classroom assignments."
    )
  }

  // 6. Construct Targeted Focus Areas (Weaknesses)
  const weaknesses: string[] = []
  if (needSupportSubjects.length > 0) {
    needSupportSubjects.forEach((s) => {
      weaknesses.push(`Requires structured reinforcement in ${s.subject} (currently averaging ${s.avg.toFixed(0)}%).`)
    })
  } else {
    weaknesses.push("Opportunities exist to stretch beyond core competencies into enrichment challenges.")
  }

  const beEvidence = evidenceItems.filter((e) =>
    e.masteryLevel?.toUpperCase().includes("BE") || e.masteryLevel?.toUpperCase().includes("AE")
  )
  if (beEvidence.length > 0 && beEvidence[0].outcome) {
    weaknesses.push(`Targeted practice needed in learning outcome: "${beEvidence[0].outcome.slice(0, 60)}...".`)
  }

  if (weaknesses.length < 3) {
    weaknesses.push("Speed and precision during independent task execution can be further refined.")
  }

  // 7. Generate Targeted Pedagogical Recommendations
  const recommendations: string[] = []

  if (needSupportSubjects.length > 0) {
    recommendations.push(
      `Provide step-by-step scaffolding and concrete visual aids during ${needSupportSubjects[0].subject} sessions.`
    )
    recommendations.push(
      `Schedule 15 minutes of daily guided review at home focusing on fundamental concepts in ${needSupportSubjects[0].subject}.`
    )
  } else {
    recommendations.push(
      "Introduce advanced extension projects and higher-order inquiry tasks to sustain intellectual curiosity."
    )
  }

  if (topSubjects.length > 0) {
    recommendations.push(
      `Leverage learner's natural confidence in ${topSubjects[0].subject} through collaborative peer-learning activities.`
    )
  }

  if (trend === "DECLINING") {
    recommendations.push(
      "Conduct a brief one-on-one check-in to identify potential conceptual blocks before the next assessment cycle."
    )
  } else {
    recommendations.push(
      "Maintain regular positive reinforcement of study habits and continuous assessment documentation."
    )
  }

  recommendations.push(
    "Coordinate with parents to align home study routines with school-based curriculum objectives."
  )

  // 8. Synthesize Overview Insight Summary
  const levelText =
    overallGrade === "EE"
      ? "Exceeding Expectations across most evaluated competencies"
      : overallGrade === "ME"
      ? "Meeting Expected standards for this grade level with consistent understanding"
      : overallGrade === "AE"
      ? "Approaching Expectations, showing steady potential with targeted areas for improvement"
      : "currently Below Expectations and will benefit from focused remedial support"

  const trendText =
    trend === "IMPROVING"
      ? "performance has shown encouraging upward momentum recently"
      : trend === "DECLINING"
      ? "recent assessments indicate a slight dip that warrants supportive intervention"
      : "performance has remained consistent throughout the session"

  const insights = `${studentName} is ${levelText}. Overall ${trendText}, with clear strengths in ${
    topSubjects[0]?.subject || "core subjects"
  }. With focused attention on ${
    needSupportSubjects[0]?.subject || "refining specific competencies"
  }, the learner is well-positioned for continuous growth.`

  return {
    overallGrade,
    trend,
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    recommendations: recommendations.slice(0, 5),
    insights,
  }
}
