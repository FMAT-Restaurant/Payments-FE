import { useEffect, useState } from 'react'

/** Current time in ms, refreshed every `intervalMs`, so relative labels ("Hace 2 min") keep moving. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])

  return now
}
