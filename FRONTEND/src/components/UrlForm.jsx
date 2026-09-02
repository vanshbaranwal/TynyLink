import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, createShortUrl } from '../lib/api.js'
import ShortLinkResult from './ShortLinkResult.jsx'

export default function UrlForm({ user, authStatus, authVersion, onAuthNeeded, onSessionExpired }) {
  const [url, setUrl] = useState('')
  const [slug, setSlug] = useState('')
  const [shortUrl, setShortUrl] = useState('')
  const [formError, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const urlRef = useRef(null)
  const customNameRef = useRef(null)
  const resultRef = useRef(null)
  const requestPending = useRef(false)
  const copiedTimer = useRef(null)
  const error = formError?.field === 'auth' && formError.authVersion !== authVersion ? null : formError

  useEffect(() => {
    if (authVersion > 0) customNameRef.current?.focus()
  }, [authVersion])

  useEffect(() => {
    if (shortUrl) resultRef.current?.focus()
  }, [shortUrl])

  useEffect(() => () => clearTimeout(copiedTimer.current), [])

  const shortenUrl = useCallback(async (value, customName = '') => {
    if (requestPending.current) throw new ApiError('A link is already being shortened. Please wait.')
    requestPending.current = true
    setError(null)
    setShortUrl('')
    setCopied(false)
    setIsLoading(true)

    try {
      if (customName && !user) {
        throw new ApiError('Sign in to choose a custom name for your link.', { status: 401, field: 'auth' })
      }
      const createdShortUrl = await createShortUrl(value, customName)
      setShortUrl(createdShortUrl)
      return createdShortUrl
    } catch (requestError) {
      setError({ message: requestError.message, field: requestError.field, authVersion })
      if (requestError.status === 401) {
        onSessionExpired()
        onAuthNeeded('login')
      }
      throw requestError
    } finally {
      requestPending.current = false
      setIsLoading(false)
    }
  }, [user, authVersion, onAuthNeeded, onSessionExpired])

  useEffect(() => {
    const context = document.modelContext
    if (!context?.registerTool) return undefined

    const lifecycle = new AbortController()
    const registration = context.registerTool(
      {
        name: 'shorten_url',
        title: 'Shorten URL',
        description: 'Create a short link and show it on the page. Random names are public; an optional custom name requires an existing signed-in session.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'The website URL to shorten.' },
            slug: { type: 'string', description: 'Optional custom name. Requires sign-in; use letters, numbers, hyphens or underscores.', maxLength: 64, pattern: '^[a-zA-Z0-9_-]*$' },
          },
          required: ['url'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        async execute(input) {
          setUrl(typeof input?.url === 'string' ? input.url : '')
          setSlug(typeof input?.slug === 'string' ? input.slug : '')
          const createdShortUrl = await shortenUrl(input?.url, input?.slug)
          return { shortUrl: createdShortUrl }
        },
      },
      { signal: lifecycle.signal },
    )

    void Promise.resolve(registration).catch(() => {})
    return () => lifecycle.abort()
  }, [shortenUrl])

  async function handleSubmit(event) {
    event.preventDefault()
    await shortenUrl(url, user ? slug : '').catch(() => {})
  }

  async function copyShortUrl(value) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setError(new ApiError('Could not copy automatically. Right-click the short link and choose “Copy link address”.'))
    }
  }

  function resetForm() {
    setUrl('')
    setSlug('')
    setShortUrl('')
    setError(null)
    setCopied(false)
    urlRef.current?.focus()
  }

  return (
    <div className="shortener-card">
      <form onSubmit={handleSubmit} noValidate aria-busy={isLoading}>
        <label htmlFor="long-url">Your long URL</label>
        <div className={`url-control${error?.field === 'url' ? ' has-error' : ''}`}>
          <svg className="url-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M10.6 13.4a4 4 0 0 0 5.66 0l2.12-2.12a4 4 0 0 0-5.66-5.66L11.5 6.84" />
            <path d="M13.4 10.6a4 4 0 0 0-5.66 0l-2.12 2.12a4 4 0 0 0 5.66 5.66l1.22-1.22" />
          </svg>
          <input
            ref={urlRef}
            id="long-url"
            name="url"
            type="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value)
              if (error) setError(null)
            }}
            placeholder="https://example.com/your-long-link"
            autoComplete="url"
            autoCapitalize="none"
            spellCheck="false"
            aria-describedby={error?.field === 'url' ? 'url-hint url-error' : 'url-hint'}
            aria-invalid={error?.field === 'url'}
            disabled={isLoading}
          />
        </div>
        <p className="url-hint" id="url-hint">Paste your link here — no need to include https://</p>

        {user ? (
          <div className="custom-option">
            <div className="custom-heading">
              <label htmlFor="custom-slug">Custom name</label>
              <span>Optional</span>
            </div>
            <div className={`url-control custom-control${error?.field === 'slug' ? ' has-error' : ''}`}>
              <span className="custom-prefix" aria-hidden="true">/</span>
              <input
                ref={customNameRef}
                id="custom-slug"
                name="slug"
                type="text"
                value={slug}
                onChange={(event) => {
                  setSlug(event.target.value)
                  if (error) setError(null)
                }}
                placeholder="my-awesome-link"
                maxLength={64}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck="false"
                aria-describedby={error?.field === 'slug' ? 'slug-hint url-error' : 'slug-hint'}
                aria-invalid={error?.field === 'slug'}
                disabled={isLoading}
              />
            </div>
            <p className="field-hint" id="slug-hint">Letters, numbers, - or _. Leave blank for a random name.</p>
          </div>
        ) : (
          <div className="custom-gate">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="10" width="14" height="11" rx="3" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2" />
            </svg>
            <div>
              <span>Want a custom name?</span>
              <p>{authStatus === 'checking' ? 'Checking your session…' : 'Create a free account to make it yours.'}</p>
            </div>
            <button type="button" className="text-button" onClick={() => onAuthNeeded('signup')} disabled={authStatus === 'checking' || isLoading}>Sign up</button>
          </div>
        )}

        <button className="shorten-button" type="submit" disabled={isLoading}>
          <span>{isLoading ? 'Shortening…' : 'Shorten URL'}</span>
          {!isLoading && <span aria-hidden="true">↗</span>}
        </button>
      </form>

      <div className="form-status" aria-live="polite">
        {error && <p className="error-message" id="url-error">{error.message}</p>}

        {shortUrl && (
          <ShortLinkResult shortUrl={shortUrl} copied={copied} onCopy={copyShortUrl} onReset={resetForm} resultRef={resultRef} />
        )}
      </div>
    </div>
  )
}
