import { useCallback, useEffect, useRef, useState } from 'react'
import { getCurrentUser, signOut } from '../lib/api.js'

export default function useAuth() {
  const [session, setSession] = useState({ user: null, status: 'checking', error: '' })
  const [isSigningOut, setIsSigningOut] = useState(false)
  const sessionRequest = useRef(null)
  const signOutPending = useRef(false)

  const refreshSession = useCallback(async () => {
    sessionRequest.current?.abort()
    const controller = new AbortController()
    sessionRequest.current = controller
    try {
      const user = await getCurrentUser({ signal: controller.signal })
      if (!controller.signal.aborted) setSession({ user, status: 'ready', error: '' })
    } catch (error) {
      if (!controller.signal.aborted) {
        setSession({ user: null, status: 'unavailable', error: error.message })
      }
    }
  }, [])

  useEffect(() => {
    void refreshSession()
    return () => sessionRequest.current?.abort()
  }, [refreshSession])

  const acceptUser = useCallback((user) => {
    sessionRequest.current?.abort()
    setSession({ user, status: 'ready', error: '' })
  }, [])

  const expireSession = useCallback(() => acceptUser(null), [acceptUser])

  async function handleSignOut() {
    if (signOutPending.current) return
    signOutPending.current = true
    setIsSigningOut(true)
    try {
      await signOut()
      acceptUser(null)
    } catch (error) {
      setSession((current) => ({ ...current, error: `Could not sign out. ${error.message}` }))
    } finally {
      signOutPending.current = false
      setIsSigningOut(false)
    }
  }

  return { ...session, isSigningOut, acceptUser, expireSession, refreshSession, handleSignOut }
}
