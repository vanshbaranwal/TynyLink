import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ApiError,
  createShortUrl,
  getCurrentUser,
  normalizeCustomName,
  normalizeWebsiteUrl,
  signIn,
  signOut,
  signUp,
} from '../src/lib/api.js'

const user = { _id: 'test-user-id', name: 'Test User', email: 'test@example.com' }

function stubRequests(t, responses) {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    const next = responses[calls.length]
    calls.push({ path, ...options, body: options.body ? JSON.parse(options.body) : undefined })
    assert.ok(next, `Unexpected request to ${path}`)
    if (next instanceof Error) throw next
    return new Response(next.raw ?? JSON.stringify(next.body), {
      status: next.status ?? 200,
      headers: { 'Content-Type': next.raw ? 'text/html' : 'application/json' },
    })
  })
  return calls
}

test('website addresses normalize safely without requiring https://', () => {
  assert.equal(normalizeWebsiteUrl(' example.com/my-page?q=1 '), 'https://example.com/my-page?q=1')
  assert.equal(normalizeWebsiteUrl('http://example.com'), 'http://example.com/')
  assert.equal(normalizeWebsiteUrl('//example.com/a'), 'https://example.com/a')
  assert.equal(normalizeWebsiteUrl('localhost:3000/a'), 'https://localhost:3000/a')
  assert.equal(normalizeWebsiteUrl('https://example.com/#section'), 'https://example.com/#section')
})

test('empty, malformed, credential-bearing and non-HTTP URLs are rejected', () => {
  for (const value of ['', '  ', null, 'not a link', 'https://', 'http:/broken', 'javascript:alert(1)', 'mailto:test@example.com', 'ftp://example.com', 'data:text/html,test', 'https://user:password@example.com']) {
    assert.throws(() => normalizeWebsiteUrl(value), (error) => error instanceof ApiError && error.field === 'url')
  }
})

test('custom names are optional, trimmed and case-preserving', () => {
  assert.equal(normalizeCustomName(), '')
  assert.equal(normalizeCustomName('  '), '')
  assert.equal(normalizeCustomName(' My-link_2026 '), 'My-link_2026')
  assert.equal(normalizeCustomName('a'.repeat(64)), 'a'.repeat(64))
})

test('custom names reject paths, spaces, query strings and excessive length', () => {
  for (const value of ['my link', 'path/link', 'name?x=1', '../admin', 'a'.repeat(65), 123, null]) {
    assert.throws(() => normalizeCustomName(value), (error) => error.field === 'slug')
  }
})

test('public shortening sends only url and includes cookie credentials', async (t) => {
  const calls = stubRequests(t, [{ body: { shortUrl: 'http://localhost:3000/random7' } }])
  assert.equal(await createShortUrl('example.com/page'), 'http://localhost:3000/random7')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].path, '/api/create')
  assert.equal(calls[0].method, 'POST')
  assert.equal(calls[0].credentials, 'include')
  assert.equal(calls[0].headers['Content-Type'], 'application/json')
  assert.deepEqual(calls[0].body, { url: 'https://example.com/page' })
})

test('blank custom name stays on the public flow without a session check', async (t) => {
  const calls = stubRequests(t, [{ body: { shortUrl: 'https://short.example/random7' } }])
  await createShortUrl('example.com', '  ')
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].body, { url: 'https://example.com/' })
})

test('signed-in custom shortening verifies /me then sends url and slug', async (t) => {
  const calls = stubRequests(t, [
    { body: { user } },
    { body: { shortUrl: 'http://localhost:3000/My-name' } },
  ])
  assert.equal(await createShortUrl('example.com', ' My-name '), 'http://localhost:3000/My-name')
  assert.deepEqual(calls.map((call) => call.path), ['/api/auth/me', '/api/create'])
  assert.equal(calls[0].method, 'GET')
  assert.deepEqual(calls[1].body, { url: 'https://example.com/', slug: 'My-name' })
  assert.ok(calls.every((call) => call.credentials === 'include'))
})

test('guest or expired session cannot submit a custom-name write', async (t) => {
  const calls = stubRequests(t, [{ status: 401, body: { message: 'unauthorized' } }])
  await assert.rejects(createShortUrl('example.com', 'my-name'), (error) => error.status === 401 && error.field === 'auth')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].path, '/api/auth/me')
})

test('unavailable session endpoint prevents a custom-name write', async (t) => {
  const calls = stubRequests(t, [{ status: 502, raw: 'Bad gateway' }])
  await assert.rejects(createShortUrl('example.com', 'my-name'), /backend is unavailable/)
  assert.equal(calls.length, 1)
})

test('session expiry between check and create never reports a random link as custom', async (t) => {
  stubRequests(t, [{ body: { user } }, { body: { shortUrl: 'http://localhost:3000/random7' } }])
  await assert.rejects(createShortUrl('example.com', 'my-name'), (error) => error.status === 401 && /did not apply/.test(error.message))
})

test('an expired custom request can be retried after a verified sign-in', async (t) => {
  const calls = stubRequests(t, [
    { status: 401, body: { message: 'unauthorized' } },
    { body: { user, message: 'login success' } },
    { body: { user } },
    { body: { user } },
    { body: { shortUrl: 'http://localhost:3000/my-name' } },
  ])
  await assert.rejects(createShortUrl('example.com/my-page', 'my-name'), (error) => error.status === 401)
  await signIn({ email: 'test@example.com', password: 'existing-password' })
  assert.equal(await createShortUrl('example.com/my-page', 'my-name'), 'http://localhost:3000/my-name')
  const writes = calls.filter((call) => call.path === '/api/create')
  assert.equal(writes.length, 1)
  assert.deepEqual(writes[0].body, { url: 'https://example.com/my-page', slug: 'my-name' })
})

test('duplicate custom names produce a useful field error, including backend 500 responses', async (t) => {
  stubRequests(t, [{ body: { user } }, { status: 500, body: { message: 'this custom url already exists' } }])
  await assert.rejects(createShortUrl('example.com', 'taken'), (error) => error.field === 'slug' && /already taken/.test(error.message))
})

test('invalid shortening input never contacts the server', async (t) => {
  const calls = stubRequests(t, [])
  await assert.rejects(createShortUrl(''))
  await assert.rejects(createShortUrl('javascript:alert(1)'))
  await assert.rejects(createShortUrl('example.com', 'a/b'))
  assert.equal(calls.length, 0)
})

test('missing or unsafe short links from the backend are rejected', async (t) => {
  stubRequests(t, [
    { body: {} },
    { body: { shortUrl: 'javascript:alert(1)' } },
    { body: { shortUrl: '/relative-link' } },
  ])
  for (let index = 0; index < 3; index += 1) {
    await assert.rejects(createShortUrl('example.com'), /valid shortened URL/)
  }
})

test('session loading treats 401 as an anonymous visitor, not an app error', async (t) => {
  stubRequests(t, [{ status: 401, body: { message: 'unauthorized' } }])
  assert.equal(await getCurrentUser(), null)
})

test('session loading does not mistake server errors or missing user data for authentication', async (t) => {
  stubRequests(t, [{ status: 500, body: { message: 'Database unavailable' } }, { body: { user: null } }])
  await assert.rejects(getCurrentUser(), /Database unavailable/)
  await assert.rejects(getCurrentUser(), /valid user session/)
})

test('registration handles the message-only response by confirming the cookie through /me', async (t) => {
  const calls = stubRequests(t, [{ body: { message: 'registration successful' } }, { body: { user } }])
  assert.deepEqual(await signUp({ name: ' Test User ', email: ' test@example.com ', password: 'a-password' }), user)
  assert.deepEqual(calls.map((call) => call.path), ['/api/auth/register', '/api/auth/me'])
  assert.deepEqual(calls[0].body, { name: 'Test User', email: 'test@example.com', password: 'a-password' })
  assert.ok(calls.every((call) => call.credentials === 'include'))
})

test('registration without a confirmed cookie never pretends the user is signed in', async (t) => {
  const calls = stubRequests(t, [{ body: { message: 'registration successful' } }, { status: 401, body: { message: 'unauthorized' } }])
  await assert.rejects(signUp({ name: 'Test User', email: 'test@example.com', password: 'a-password' }), /account was created.*session could not be confirmed/)
  assert.equal(calls.length, 2)
})

test('login sends credentials and confirms a persistent session', async (t) => {
  const calls = stubRequests(t, [{ body: { user, message: 'login success' } }, { body: { user } }])
  assert.deepEqual(await signIn({ email: 'test@example.com', password: 'existing-password' }), user)
  assert.deepEqual(calls.map((call) => call.path), ['/api/auth/login', '/api/auth/me'])
  assert.deepEqual(calls[0].body, { email: 'test@example.com', password: 'existing-password' })
})

test('a login response alone is insufficient if /me cannot confirm the cookie', async (t) => {
  stubRequests(t, [{ body: { user, message: 'login success' } }, { status: 401, body: { message: 'unauthorized' } }])
  await assert.rejects(signIn({ email: 'test@example.com', password: 'existing-password' }), /sign-in session could not be confirmed/)
})

test('auth validates required credentials locally, including missing passwords', async (t) => {
  const calls = stubRequests(t, [])
  await assert.rejects(signIn({ email: 'test@example.com' }), /password/)
  await assert.rejects(signIn({ email: 'invalid', password: 'x' }), /email/)
  await assert.rejects(signUp({ name: ' ', email: 'test@example.com', password: 'password' }), /name/)
  await assert.rejects(signUp({ name: 'Test', email: 'test@example.com', password: 'abc' }), /4 characters/)
  assert.equal(calls.length, 0)
})

test('signup accepts exactly four characters and sends the password unchanged', async (t) => {
  const calls = stubRequests(t, [{ body: { message: 'registration successful' } }, { body: { user } }])
  assert.deepEqual(await signUp({ name: 'Test', email: 'test@example.com', password: 'aB12' }), user)
  assert.equal(calls[0].body.password, 'aB12')
})

test('signup rejects all non-empty passwords below four characters before making a request', async (t) => {
  const calls = stubRequests(t, [])
  for (const password of ['a', 'ab', 'abc']) {
    await assert.rejects(signUp({ name: 'Test', email: 'test@example.com', password }), /at least 4 characters/)
  }
  assert.equal(calls.length, 0)
})

test('failed login preserves the backend error and does not request a session', async (t) => {
  const calls = stubRequests(t, [{ status: 500, body: { message: 'invalid credentials' } }])
  await assert.rejects(signIn({ email: 'test@example.com', password: 'wrong-password' }), /invalid credentials/)
  assert.equal(calls.length, 1)
})

test('logout uses the backend cookie-clearing endpoint', async (t) => {
  const calls = stubRequests(t, [{ body: { message: 'logout success' } }])
  await signOut()
  assert.equal(calls[0].path, '/api/auth/logout')
  assert.equal(calls[0].method, 'POST')
  assert.equal(calls[0].credentials, 'include')
})

test('public shortening remains available after sign-out', async (t) => {
  const calls = stubRequests(t, [
    { body: { message: 'logout success' } },
    { body: { shortUrl: 'http://localhost:3000/random7' } },
  ])
  await signOut()
  await createShortUrl('example.com')
  assert.deepEqual(calls.map((call) => call.path), ['/api/auth/logout', '/api/create'])
  assert.deepEqual(calls[1].body, { url: 'https://example.com/' })
})

test('network failures and non-JSON proxy errors become readable messages', async (t) => {
  stubRequests(t, [new TypeError('Failed to fetch'), { status: 502, raw: '<html>Bad gateway</html>' }])
  await assert.rejects(createShortUrl('example.com'), /Cannot reach the backend/)
  await assert.rejects(createShortUrl('example.com'), /backend is unavailable/)
})

test('a successful HTTP response containing HTML is not treated as a working API', async (t) => {
  stubRequests(t, [{ raw: '<html>Frontend fallback</html>' }])
  await assert.rejects(getCurrentUser(), /unexpected response/)
})

test('caller cancellation is propagated without a misleading backend error', async (t) => {
  const controller = new AbortController()
  controller.abort()
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    assert.equal(path, '/api/auth/me')
    assert.equal(options.signal.aborted, true)
    throw new DOMException('The operation was aborted', 'AbortError')
  })
  await assert.rejects(getCurrentUser({ signal: controller.signal }), { name: 'AbortError' })
})
