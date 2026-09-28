"use client"

import { useState, useRef, useCallback } from "react"
import { signIn } from "next-auth/react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const isSubmitting = useRef(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isSubmitting.current) return
    isSubmitting.current = true
    
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password. Please try again.")
        setLoading(false)
        isSubmitting.current = false
      } else if (result?.ok) {
        window.location.href = "/dashboard"
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      setLoading(false)
      isSubmitting.current = false
    }
  }, [email, password])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900 via-indigo-950 to-slate-950 px-4 py-12 relative overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-white/95 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/20 w-full max-w-md relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-indigo-500/30">
            🎓
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Student Performance System
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">AI-Powered Analytics & School Intelligence</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
          <div>
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition disabled:opacity-50 text-slate-900 text-sm font-medium placeholder:text-slate-400"
              placeholder="admin@system.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition disabled:opacity-50 text-slate-900 text-sm font-medium placeholder:text-slate-400"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs sm:text-sm flex items-center gap-2.5 font-medium animate-slide-up">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold py-3.5 px-4 rounded-xl transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 active:scale-[0.99]"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Dashboard</span>
            )}
          </button>
        </form>

        <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Quick Demo Access:</p>
          <div className="space-y-1.5 text-xs text-slate-700">
            <p><strong className="text-slate-900">Super Admin:</strong> admin@system.com / admin123</p>
            <p><strong className="text-slate-900">School Admin:</strong> admin@demo-school.com / school123</p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6 font-medium">
          © 2025 Student Performance System. All rights reserved.
        </p>
      </div>
    </div>
  )
}
