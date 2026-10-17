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

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M4 10h11M11 6l4 4-4 4" />
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
        <span className="header-note">Short links, thoughtfully made.</span>
        <nav className="header-actions" aria-label="Account">
          {auth.user ? (
            <>
              <span className="account-chip" title={auth.user.email}>
                <span className="account-avatar" aria-hidden="true">{(auth.user.name || auth.user.email || 'U').charAt(0).toUpperCase()}</span>
                <span className="account-name">{auth.user.name || auth.user.email}</span>
              </span>
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
            <div className="link-preview" aria-label="Example of a shortened link">
              <div className="preview-url">
                <span>Before</span>
                <p>example.com/articles/a-very-long-link</p>
              </div>
              <span className="preview-arrow"><ArrowIcon /></span>
              <div className="preview-url preview-url-short">
                <span>After</span>
                <p>tyny.link/hello</p>
              </div>
            </div>
          </div>
          <UrlForm user={auth.user} authStatus={auth.status} authVersion={authVersion} onAuthNeeded={openAuth} onSessionExpired={auth.expireSession} />
        </section>

        <section className="steps" aria-labelledby="steps-title">
          <div className="steps-heading">
            <span className="section-kicker">A cleaner way to share</span>
            <h2 id="steps-title">From long to memorable in three steps.</h2>
          </div>
          <div className="steps-grid">
          <article>
            <span className="step-number">01</span>
            <div><h3>Paste your link</h3><p>Drop in any web address. We validate it before creating your link.</p></div>
          </article>
          <article>
            <span className="step-number">02</span>
            <div><h3>Personalize it</h3><p>Use a random name, or sign in to choose a custom one.</p></div>
          </article>
          <article>
            <span className="step-number">03</span>
            <div><h3>Share anywhere</h3><p>Copy the complete short URL and send it wherever it needs to go.</p></div>
          </article>
          </div>
        </section>
      </main>

      <footer>
        <p>Built for cleaner, more confident sharing.</p>
        <p>TynyLink · {new Date().getFullYear()}</p>
      </footer>
      {authMode && <AuthDialog initialMode={authMode} onClose={() => setAuthMode(null)} onAuthenticated={handleAuthenticated} />}
    </div>
  )
}
