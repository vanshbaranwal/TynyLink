import { useEffect, useRef, useState } from 'react'
import { MIN_PASSWORD_LENGTH, signIn, signUp } from '../lib/api.js'

export default function AuthDialog({ initialMode, onClose, onAuthenticated }) {
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    setShowPassword(false)
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
      <button className="dialog-close" type="button" aria-label={isSignUp ? 'Close sign-up dialog' : 'Close sign-in dialog'} onClick={onClose} disabled={isSubmitting}>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="m5 5 10 10M15 5 5 15" /></svg>
      </button>
      <span className="auth-symbol" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M10.6 13.4a4 4 0 0 0 5.66 0l2.12-2.12a4 4 0 0 0-5.66-5.66L11.5 6.84" />
          <path d="M13.4 10.6a4 4 0 0 0-5.66 0l-2.12 2.12a4 4 0 0 0 5.66 5.66l1.22-1.22" />
        </svg>
      </span>
      <span className="auth-kicker">Your link, your name</span>
      <h2 id="auth-title">{isSignUp ? 'Make it yours.' : 'Welcome back.'}</h2>
      <p id="auth-description">
        {isSignUp ? 'Create a free account to choose custom names for your short links.' : 'Sign in to give your next short link a custom name.'}
      </p>

      <form className="auth-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
        {isSignUp && (
          <div className="auth-field">
            <label htmlFor="auth-name">Your name</label>
            <div className="auth-control">
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" /><path d="M4.5 16c.7-2.7 2.5-4 5.5-4s4.8 1.3 5.5 4" /></svg>
              <input ref={firstInputRef} id="auth-name" name="name" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required disabled={isSubmitting} />
            </div>
          </div>
        )}
        <div className="auth-field">
          <label htmlFor="auth-email">Email address</label>
          <div className="auth-control">
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><rect x="3" y="4.5" width="14" height="11" rx="2.5" /><path d="m4.5 6 5.5 4 5.5-4" /></svg>
            <input ref={isSignUp ? undefined : firstInputRef} id="auth-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck="false" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isSubmitting} />
          </div>
        </div>
        <div className="auth-field">
          <label htmlFor="auth-password">Password</label>
          <div className="auth-control auth-password-control">
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><rect x="4" y="8" width="12" height="9" rx="2.5" /><path d="M6.5 8V6.5a3.5 3.5 0 0 1 7 0V8M10 11.5v2" /></svg>
            <input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={isSignUp ? MIN_PASSWORD_LENGTH : undefined} aria-describedby={isSignUp ? 'password-hint' : undefined} required disabled={isSubmitting} />
            <button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)} disabled={isSubmitting}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {isSignUp && <p id="password-hint" className="field-hint">Use at least {MIN_PASSWORD_LENGTH} characters.</p>}
        </div>
        {error && <p className="error-message auth-error" role="alert">{error}</p>}
        <button className="shorten-button" type="submit" disabled={isSubmitting}>
          {isSubmitting && <span className="button-spinner" aria-hidden="true" />}
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
