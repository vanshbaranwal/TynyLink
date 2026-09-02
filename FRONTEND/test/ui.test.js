import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { fileURLToPath } from 'node:url'
import { Children, createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let server

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
})

after(async () => server?.close())

test('TynyLink branding appears in the header, footer, and sign-in dialog without changing the tagline', async () => {
  const { default: HomePage } = await server.ssrLoadModule('/src/pages/HomePage.jsx')
  const { default: AuthDialog } = await server.ssrLoadModule('/src/components/AuthDialog.jsx')
  const homeMarkup = renderToStaticMarkup(createElement(HomePage))
  const loginMarkup = renderToStaticMarkup(createElement(AuthDialog, { initialMode: 'login' }))

  assert.match(homeMarkup, /aria-label="TynyLink home"/)
  assert.match(homeMarkup, /<span>TynyLink<\/span>/)
  assert.match(homeMarkup, /<p>TynyLink · \d{4}<\/p>/)
  assert.match(homeMarkup, /Long links,<br\/><span>made tiny\.<\/span>/)
  assert.match(loginMarkup, /New to TynyLink\?/)
  assert.doesNotMatch(homeMarkup + loginMarkup, /SnipLink|SnpiLink/i)
})

test('sign-in and sign-up buttons render before the initial session request finishes', async () => {
  const { default: HomePage } = await server.ssrLoadModule('/src/pages/HomePage.jsx')
  const markup = renderToStaticMarkup(createElement(HomePage))
  const accountNavigation = markup.match(/<nav[^>]*aria-label="Account"[^>]*>(.*?)<\/nav>/)?.[1]

  assert.ok(accountNavigation, 'The header must provide account navigation')
  assert.match(accountNavigation, /<button[^>]*>Sign in<\/button>/)
  assert.match(accountNavigation, /<button[^>]*>Sign up<\/button>/)
  assert.doesNotMatch(accountNavigation, /disabled|Checking session/)
})

test('signup password input and helper text both specify four characters', async () => {
  const { default: AuthDialog } = await server.ssrLoadModule('/src/components/AuthDialog.jsx')
  const markup = renderToStaticMarkup(createElement(AuthDialog, { initialMode: 'signup' }))
  assert.match(markup, /<input[^>]*id="auth-password"[^>]*minLength="4"/i)
  assert.match(markup, /Use at least 4 characters\./)
  assert.doesNotMatch(markup, /8 characters|minLength="8"/i)
})

test('sign-in does not impose a new minimum on existing passwords', async () => {
  const { default: AuthDialog } = await server.ssrLoadModule('/src/components/AuthDialog.jsx')
  const markup = renderToStaticMarkup(createElement(AuthDialog, { initialMode: 'login' }))
  assert.match(markup, /autoComplete="current-password"/i)
  assert.doesNotMatch(markup, /minLength=/i)
})

test('short link displays the full destination including its HTTP or HTTPS scheme', async () => {
  const { default: ShortLinkResult } = await server.ssrLoadModule('/src/components/ShortLinkResult.jsx')
  for (const shortUrl of [
    'http://localhost:3000/4UpJ5b5',
    'http://localhost:3000/My-name_2026',
    'https://links.example/s/my-link?ref=1#share',
    `https://links.example/${'long-custom-name-'.repeat(10)}`,
  ]) {
    const markup = renderToStaticMarkup(createElement(ShortLinkResult, { shortUrl }))
    assert.ok(markup.includes(`href="${shortUrl}"`))
    assert.ok(markup.includes(`>${shortUrl}</a>`))
    assert.doesNotMatch(markup, /SnipLink is the display name|result-url-hint/)
  }
})

test('the displayed URL, link destination, and copied URL are identical', async () => {
  const { default: ShortLinkResult } = await server.ssrLoadModule('/src/components/ShortLinkResult.jsx')
  const shortUrl = 'http://localhost:3000/4UpJ5b5'
  let copiedValue
  const result = ShortLinkResult({ shortUrl, onCopy: (value) => { copiedValue = value } })
  const linkRow = Children.toArray(result.props.children).find((child) => child.props.className === 'result-link')
  const link = Children.toArray(linkRow.props.children).find((child) => child.type === 'a')
  const copyButton = Children.toArray(linkRow.props.children).find((child) => child.type === 'button')
  copyButton.props.onClick()
  assert.equal(link.props.children, shortUrl)
  assert.equal(link.props.href, shortUrl)
  assert.equal(copiedValue, shortUrl)
})
