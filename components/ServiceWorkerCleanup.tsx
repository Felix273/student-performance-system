"use client"

import { useEffect } from "react"

export default function ServiceWorkerCleanup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      await Promise.all(registrations.map((registration) => registration.unregister()))
      if ("caches" in window) {
        const names = await caches.keys()
        await Promise.all(names.map((name) => caches.delete(name)))
      }
    }).catch(() => {
      // Cleanup is best-effort; the app must remain usable if storage is restricted.
    })
  }, [])

  return null
}
