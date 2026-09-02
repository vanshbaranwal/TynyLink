import { useEffect, useRef, useState } from 'react'
import { MIN_PASSWORD_LENGTH, signIn, signUp } from '../lib/api.js'

export default function AuthDialog({ initialMode, onClose, onAuthenticated }) {
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const dialogRef = useRef(null)
  const firstInputRef = useRef(null)
  const submissionPending = useRef(false)
  const isSignUp = mode === 'signup'

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    firstInputRef.current?.focus()
    return () => dialog.close()
  }, [])

  function switchMode() {
    setMode(isSignUp ? 'login' : 'signup')
    setPassword('')
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submissionPending.current) return
    submissionPending.current = true
    setIsSubmitting(true)
    setError('')
    try {
      const user = await (isSignUp ? signUp({ name, email, password }) : signIn({ email, password }))
      onAuthenticated(user)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      submissionPending.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="auth-dialog"
      aria-labelledby="auth-title"
      aria-describedby="auth-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!submissionPending.current) onClose()
      }}
    >
      <button className="dialog-close" type="button" aria-label="Close sign-in dialog" onClick={onClose} disabled={isSubmitting}>×</button>
      <span className="auth-kicker">Your link, your name</span>
      <h2 id="auth-title">{isSignUp ? 'Make it yours.' : 'Welcome back.'}</h2>
      <p id="auth-description">
        {isSignUp ? 'Create a free account to choose custom names for your short links.' : 'Sign in to give your next short link a custom name.'}
      </p>

      <form className="auth-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
        {isSignUp && (
          <div className="auth-field">
            <label htmlFor="auth-name">Your name</label>
            <input ref={firstInputRef} id="auth-name" name="name" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required disabled={isSubmitting} />
          </div>
        )}
        <div className="auth-field">
          <label htmlFor="auth-email">Email address</label>
          <input ref={isSignUp ? undefined : firstInputRef} id="auth-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck="false" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isSubmitting} />
        </div>
        <div className="auth-field">
          <label htmlFor="auth-password">Password</label>
          <input id="auth-password" name="password" type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={isSignUp ? MIN_PASSWORD_LENGTH : undefined} aria-describedby={isSignUp ? 'password-hint' : undefined} required disabled={isSubmitting} />
          {isSignUp && <p id="password-hint" className="field-hint">Use at least {MIN_PASSWORD_LENGTH} characters.</p>}
        </div>
        {error && <p className="error-message auth-error" role="alert">{error}</p>}
        <button className="shorten-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isSignUp ? 'Creating account…' : 'Signing in…') : (isSignUp ? 'Create account' : 'Sign in')}
        </button>
      </form>

      <p className="auth-switch">
        {isSignUp ? 'Already have an account?' : 'New to TynyLink?'}{' '}
        <button className="text-button" type="button" onClick={switchMode} disabled={isSubmitting}>{isSignUp ? 'Sign in' : 'Sign up'}</button>
      </p>
      <p className="auth-note">Just need a random short link? No account needed.</p>
    </dialog>
  )
}
