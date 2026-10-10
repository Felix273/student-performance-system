export type CbcBandScope = "SCHOOL" | "STAGE" | "GRADE" | "CLASS"

export interface CbcBand {
  id: string
  code: string
  label: string
  parentLevelCode: string | null
  minPercent: number
  maxPercent: number
  sequence: number
}

export interface CbcBandMap {
  id: string
  schoolId: string
  academicYearId: string
  scope: CbcBandScope
  scopeCode: string
  classId: string | null
  subjectId: string | null
  bands: CbcBand[]
}

export interface CbcBandResolutionContext {
  schoolId: string
  academicYearId: string
  classId?: string | null
  gradeCode?: string | null
  stageCode?: string | null
  subjectId?: string | null
  score: number
  maxScore: number
}

export type CbcBandResolution =
  | { status: "matched"; normalizedPercent: number; map: CbcBandMap; band: CbcBand }
  | { status: "unmatched"; normalizedPercent: number; map: CbcBandMap }
  | { status: "ambiguous"; normalizedPercent: number; map: CbcBandMap; bands: CbcBand[] }
  | { status: "ambiguous-map"; normalizedPercent: number; maps: CbcBandMap[] }
  | { status: "no-map"; normalizedPercent: number }
  | { status: "invalid-input"; reason: string }

const scopeRank: Record<CbcBandScope, number> = { SCHOOL: 0, STAGE: 1, GRADE: 2, CLASS: 3 }

function scopeMatches(map: CbcBandMap, context: CbcBandResolutionContext): boolean {
  if (map.schoolId !== context.schoolId || map.academicYearId !== context.academicYearId) return false
  if (map.scope === "SCHOOL") return true
  if (map.scope === "STAGE") return Boolean(context.stageCode && map.scopeCode === context.stageCode)
  if (map.scope === "GRADE") return Boolean(context.gradeCode && map.scopeCode === context.gradeCode)
  return Boolean(context.classId && (map.classId === context.classId || map.scopeCode === context.classId))
}

export function resolveCbcBand(maps: readonly CbcBandMap[], context: CbcBandResolutionContext): CbcBandResolution {
  if (!Number.isFinite(context.score) || !Number.isFinite(context.maxScore) || context.maxScore <= 0 || context.score < 0 || context.score > context.maxScore) {
    return { status: "invalid-input", reason: "Score must be finite and between zero and a positive maximum." }
  }

  const normalizedPercent = (context.score / context.maxScore) * 100
  const matchingMaps = maps.filter((map) => scopeMatches(map, context) && (map.subjectId === null || map.subjectId === (context.subjectId ?? null)))
  if (matchingMaps.length === 0) return { status: "no-map", normalizedPercent }

  const bestSpecificity = Math.max(...matchingMaps.map((map) => scopeRank[map.scope] * 2 + (map.subjectId === null ? 0 : 1)))
  const bestMaps = matchingMaps.filter((map) => scopeRank[map.scope] * 2 + (map.subjectId === null ? 0 : 1) === bestSpecificity)
  if (bestMaps.length !== 1) return { status: "ambiguous-map", normalizedPercent, maps: bestMaps }

  const map = bestMaps[0]
  const matchingBands = map.bands.filter((band) => normalizedPercent >= band.minPercent && normalizedPercent <= band.maxPercent)
  if (matchingBands.length === 0) return { status: "unmatched", normalizedPercent, map }
  if (matchingBands.length > 1) return { status: "ambiguous", normalizedPercent, map, bands: matchingBands }
  return { status: "matched", normalizedPercent, map, band: matchingBands[0] }
}