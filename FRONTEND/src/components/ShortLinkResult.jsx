export default function ShortLinkResult({ shortUrl, copied, onCopy, onReset, resultRef }) {
  return (
    <div className="result" ref={resultRef} tabIndex="-1">
      <div className="result-heading">
        <span>Your short link is ready</span>
        <button type="button" onClick={onReset}>Shorten another</button>
      </div>
      <div className="result-link">
        <a href={shortUrl} title={shortUrl} target="_blank" rel="noreferrer">{shortUrl}</a>
        <button type="button" onClick={() => onCopy(shortUrl)} aria-label="Copy short URL" className={copied ? 'copied' : ''}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
