type BrandLogoProps = {
  inverse?: boolean
  showName?: boolean
  compact?: boolean
  markSize?: number
}

export default function BrandLogo({ inverse = false, showName = true, compact = false, markSize = 40 }: BrandLogoProps) {
  const foreground = inverse ? "text-white" : "text-[#172c36]"

  return (
    <span className={`inline-flex min-w-0 items-center ${compact ? "gap-2" : "gap-3"}`}>
      <span
        className="flex shrink-0 items-center justify-center rounded-[11px] bg-[#172c36]"
        style={{ width: markSize, height: markSize }}
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" fill="none" className="h-[78%] w-[78%]">
          <path d="M8.5 17.5c5-.5 10.4 1 15.5 4.5 5.1-3.5 10.5-5 15.5-4.5v14c-5-.5-10.4 1-15.5 4.5-5.1-3.5-10.5-5-15.5-4.5v-14Z" stroke="#f5f3e9" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M24 22v14" stroke="#f5f3e9" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M15 25v3M20 23v5M28 22v6M33 24v4" stroke="#e8bd52" strokeWidth="2.2" strokeLinecap="round" />
          <path d="m34.5 12 2 2 3.5-4" stroke="#77c8b4" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {showName && (
        <span className={`block min-w-0 leading-tight ${foreground}`}>
          <strong className={`block font-bold ${compact ? "text-[13px]" : "text-[15px]"}`}>
            <span className="font-semibold">Fentech</span> StudentOS
          </strong>
          {!compact && <small className={`mt-1 block text-[9px] font-semibold uppercase tracking-[.15em] ${inverse ? "text-white/55" : "text-[#68767b]"}`}>School performance workspace</small>}
        </span>
      )}
    </span>
  )
}