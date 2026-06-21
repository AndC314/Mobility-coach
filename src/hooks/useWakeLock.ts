import { useEffect, useRef } from 'react'

/**
 * Requests a screen wake lock while `active` is true, preventing the
 * device from sleeping during a running timer.
 *
 * Handles the iOS/Android edge case where the OS forcibly releases the
 * lock when the app goes to the background — re-acquires automatically
 * when the user returns to the tab while the timer is still running.
 */
export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null)
  const activeRef = useRef(active)
  activeRef.current = active

  async function acquire() {
    if (!('wakeLock' in navigator)) return
    if (lockRef.current) return // already held
    try {
      lockRef.current = await (navigator as any).wakeLock.request('screen')
      if (lockRef.current) {
        lockRef.current.addEventListener('release', () => {
          lockRef.current = null
        })
      }
    } catch {
      // permission denied or not supported — silent fail, timer still works
    }
  }

  async function release() {
    if (!lockRef.current) return
    try {
      await lockRef.current.release()
    } catch {
      // already released
    }
    lockRef.current = null
  }

  // Acquire or release based on active state
  useEffect(() => {
    if (active) {
      acquire()
    } else {
      release()
    }
    return () => { release() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Re-acquire after returning from background (iOS releases lock on hide)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && activeRef.current) {
        acquire()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])
}
