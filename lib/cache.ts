/**
 * Server-side caching utilities.
 *
 * WHY NOT a module-level Map?
 * In serverless environments (Vercel, AWS Lambda) every function invocation
 * may run in a fresh process — a module-level Map is reset on every cold start
 * and is not shared across concurrent instances. It gives the illusion of
 * caching while doing nothing in production.
 *
 * What to use instead:
 *   • `cacheQuery` below  — wraps Next.js `unstable_cache`, backed by the
 *     Next.js Data Cache (file system / Redis depending on deployment).
 *     Correct for server components and route handlers.
 *   • `cache()` from React — per-request deduplication within a single
 *     render pass. Import it directly from "react" where needed.
 *   • For truly global shared state use an external store (Redis / Upstash).
 */
import { unstable_cache } from "next/cache"

/**
 * Wraps an async data-fetching function with Next.js Data Cache.
 *
 * @param fn      The async fetcher (e.g. a Prisma query).
 * @param tags    Cache tags — used to invalidate with `revalidateTag`.
 * @param revalidate  TTL in seconds (default: 60).
 *
 * @example
 * const getSchool = cacheQuery(
 *   (schoolId: string) => prisma.school.findUnique({ where: { id: schoolId } }),
 *   ["school"],
 * )
 * const school = await getSchool(schoolId)
 */
export function cacheQuery<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  tags: string[],
  revalidate = 60,
): (...args: TArgs) => Promise<TReturn> {
  // unstable_cache requires a stable key derived from the function name and tags.
  const keyParts = [fn.name || "anonymous", ...tags]
  return unstable_cache(fn, keyParts, { tags, revalidate }) as (...args: TArgs) => Promise<TReturn>
}
