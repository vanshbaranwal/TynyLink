export default function ShortLinkResult({ shortUrl, copied, onCopy, onReset, resultRef }) {
  return (
    <div className="result" ref={resultRef} tabIndex="-1">
      <div className="result-heading">
        <span className="result-title">
          <span className="success-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none"><path d="m5.2 10.1 3 3 6.6-6.6" /></svg>
          </span>
          <span><strong>Ready to share</strong><small>Your short link is live.</small></span>
        </span>
        <button type="button" onClick={onReset}>Shorten another</button>
      </div>
      <div className="result-link">
        <a href={shortUrl} title={shortUrl} target="_blank" rel="noreferrer">{shortUrl}</a>
        <button type="button" onClick={() => onCopy(shortUrl)} aria-label={copied ? 'Short URL copied' : 'Copy short URL'} aria-pressed={copied} className={copied ? 'copied' : ''}>
          {copied ? (
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="m5.2 10.1 3 3 6.6-6.6" /></svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><rect x="6.5" y="6.5" width="9" height="9" rx="2" /><path d="M13.5 6.5v-2h-9v9h2" /></svg>
          )}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
