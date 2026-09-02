import { useCallback, useState } from 'react'
import AuthDialog from '../components/AuthDialog.jsx'
import UrlForm from '../components/UrlForm.jsx'
import useAuth from '../hooks/useAuth.js'

function LinkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M10.6 13.4a4 4 0 0 0 5.66 0l2.12-2.12a4 4 0 0 0-5.66-5.66L11.5 6.84" />
      <path d="M13.4 10.6a4 4 0 0 0-5.66 0l-2.12 2.12a4 4 0 0 0 5.66 5.66l1.22-1.22" />
    </svg>
  )
}

export default function HomePage() {
  const auth = useAuth()
  const [authMode, setAuthMode] = useState(null)
  const [authVersion, setAuthVersion] = useState(0)
  const openAuth = useCallback((mode) => setAuthMode(mode), [])

  function handleAuthenticated(user) {
    auth.acceptUser(user)
    setAuthMode(null)
    setAuthVersion((version) => version + 1)
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="TynyLink home">
          <span className="brand-mark"><LinkIcon /></span>
          <span>TynyLink</span>
        </a>
        <nav className="header-actions" aria-label="Account">
          {auth.user ? (
            <>
              <span className="account-name" title={auth.user.email}>Hi, {auth.user.name || auth.user.email}</span>
              <button className="header-button" type="button" onClick={auth.handleSignOut} disabled={auth.isSigningOut}>{auth.isSigningOut ? 'Signing out…' : 'Sign out'}</button>
            </>
          ) : (
            <>
              <button className="header-button" type="button" onClick={() => openAuth('login')}>Sign in</button>
              <button className="header-button header-signup" type="button" onClick={() => openAuth('signup')}>Sign up</button>
            </>
          )}
        </nav>
      </header>

      <main className="main-content">
        {auth.error && (
          <div className="connection-notice" role="status">
            <p>{auth.error}</p>
            <button type="button" className="text-button" onClick={auth.refreshSession}>Retry connection</button>
          </div>
        )}
        <section className="hero" aria-labelledby="page-title">
          <div className="hero-intro">
            <div className="eyebrow">Simple. Fast. Free.</div>
            <h1 id="page-title">
              Long links,<br />
              <span>made tiny.</span>
            </h1>
            <p className="hero-copy">
              Turn your long URL into a clean, shareable link in seconds.
              No sign-up needed for a random short link.
            </p>
          </div>
          <UrlForm user={auth.user} authStatus={auth.status} authVersion={authVersion} onAuthNeeded={openAuth} onSessionExpired={auth.expireSession} />
        </section>

        <section className="steps" aria-label="How it works">
          <article>
            <span className="step-number">01</span>
            <div><h2>Paste your link</h2><p>Drop in any long URL you want to make easier to share.</p></div>
          </article>
          <article>
            <span className="step-number">02</span>
            <div><h2>Make it short</h2><p>We turn it into a compact link with one quick click.</p></div>
          </article>
          <article>
            <span className="step-number">03</span>
            <div><h2>Share anywhere</h2><p>Copy your new link and send it wherever it needs to go.</p></div>
          </article>
        </section>
      </main>

      <footer>
        <p>Made for links that are too long.</p>
        <p>TynyLink · {new Date().getFullYear()}</p>
      </footer>
      {authMode && <AuthDialog initialMode={authMode} onClose={() => setAuthMode(null)} onAuthenticated={handleAuthenticated} />}
    </div>
  )
}
