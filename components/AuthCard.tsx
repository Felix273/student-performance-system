import BrandLogo from "@/components/BrandLogo"

export default function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5 py-10 text-[#1c1c1e]">
      <div className="w-full max-w-[440px]">
        <div className="mb-7"><BrandLogo markSize={40} /></div>
        <div className="rounded-[28px] bg-white p-7 shadow-[0_18px_60px_rgba(28,28,30,.08)] sm:p-10">
          <h1 className="text-2xl font-medium tracking-[-.04em]">{title}</h1>
          {subtitle && <p className="mt-3 text-sm leading-6 text-[#6b6f7e]">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </main>
  )
}

export const authInputClass = "w-full rounded-xl border border-[#e0e2e8] bg-[#f7f8fa] px-4 py-3.5 text-sm font-medium text-[#1c1c1e] outline-none transition placeholder:text-[#a5a8b5] focus:border-[#4262ff] focus:bg-white focus:ring-4 focus:ring-[#4262ff]/10 disabled:opacity-60"
export const authButtonClass = "w-full rounded-full bg-[#1c1c1e] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#2c2c34] focus:outline-none focus:ring-4 focus:ring-[#4262ff]/20 disabled:cursor-not-allowed disabled:opacity-60"
