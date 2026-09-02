const API_BASE_URL = (import.meta.env?.VITE_API_URL || '').replace(/\/+$/, '')
const REQUEST_TIMEOUT_MS = 15000
export const MIN_PASSWORD_LENGTH = 4

export class ApiError extends Error {
  constructor(message, { status = 0, field, cause } = {}) {
    super(message, { cause })
    this.name = 'ApiError'
    this.status = status
    this.field = field
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(abort, REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    })
    const data = await response.json().catch((error) => {
      if (controller.signal.aborted) throw error
      return null
    })

    if (!response.ok) {
      throw new ApiError(
        typeof data?.message === 'string'
          ? data.message
          : 'The backend is unavailable. Check that it is running, then try again.',
        { status: response.status },
      )
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new ApiError('The backend returned an unexpected response. Please try again.')
    }
    return data
  } catch (error) {
    if (signal?.aborted || error instanceof ApiError) throw error
    if (controller.signal.aborted) {
      throw new ApiError('The backend took too long to respond. Please try again.', { cause: error })
    }
    throw new ApiError(
      'Cannot reach the backend. Check that it is running and the API address is correct.',
      { cause: error },
    )
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

export function normalizeWebsiteUrl(value) {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!trimmed) throw new ApiError('Paste a URL to shorten first.', { field: 'url' })

  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
  const isHostWithPort = /^[^/?#:\s]+:\d+(?:[/?#]|$)/.test(trimmed)
  const candidate = trimmed.startsWith('//')
    ? `https:${trimmed}`
    : hasScheme && !isHostWithPort ? trimmed : `https://${trimmed}`

  try {
    const parsed = new URL(candidate)
    if (
      !['http:', 'https:'].includes(parsed.protocol)
      || /\s/.test(trimmed)
      || parsed.username
      || parsed.password
      || (hasScheme && !isHostWithPort && !/^https?:\/\//i.test(trimmed))
    ) {
      throw new Error('Unsupported website address')
    }
    return parsed.href
  } catch (error) {
    throw new ApiError('Enter a valid http:// or https:// website address.', { field: 'url', cause: error })
  }
}

export function normalizeCustomName(value = '') {
  if (typeof value !== 'string') {
    throw new ApiError('Enter a custom name using letters, numbers, hyphens or underscores.', { field: 'slug' })
  }
  const slug = value.trim()
  if (slug && !/^[a-zA-Z0-9_-]{1,64}$/.test(slug)) {
    throw new ApiError('Use 1–64 letters, numbers, hyphens or underscores for your custom name.', { field: 'slug' })
  }
  return slug
}

export async function getCurrentUser(options = {}) {
  try {
    const data = await request('/api/auth/me', options)
    if (!data.user || typeof data.user._id !== 'string' || !data.user._id) {
      throw new ApiError('The backend did not return a valid user session.')
    }
    return data.user
  } catch (error) {
    if (error.status === 401) return null
    throw error
  }
}

async function authenticate(path, fields) {
  const isRegistration = path.endsWith('/register')
  const email = typeof fields.email === 'string' ? fields.email.trim() : ''
  const password = typeof fields.password === 'string' ? fields.password : ''
  const name = typeof fields.name === 'string' ? fields.name.trim() : ''

  if (isRegistration && !name) throw new ApiError('Enter your name to create an account.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError('Enter a valid email address.')
  if (!password) throw new ApiError('Enter your password.')
  if (isRegistration && password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`)
  }

  await request(path, {
    method: 'POST',
    body: { ...(isRegistration ? { name } : {}), email, password },
  })

  // Registration returns only a message. Confirm the HTTP-only cookie through /me.
  try {
    const user = await getCurrentUser()
    if (!user) throw new ApiError('No authenticated session was returned.', { status: 401 })
    return user
  } catch (error) {
    throw new ApiError(
      isRegistration
        ? 'Your account was created, but the session could not be confirmed. Please try signing in.'
        : 'Your sign-in session could not be confirmed. Check that cookies are enabled and try again.',
      { cause: error, field: 'auth' },
    )
  }
}

export function signUp(fields = {}) {
  return authenticate('/api/auth/register', fields)
}

export function signIn(fields = {}) {
  return authenticate('/api/auth/login', fields)
}

export function signOut() {
  return request('/api/auth/logout', { method: 'POST' })
}

export async function createShortUrl(value, customName = '') {
  const url = normalizeWebsiteUrl(value)
  const slug = normalizeCustomName(customName)

  // The existing create route ignores a slug for guests, so check before sending it.
  if (slug && !await getCurrentUser()) {
    throw new ApiError('Your session has expired. Sign in to use a custom name.', { status: 401, field: 'auth' })
  }

  let data
  try {
    data = await request('/api/create', {
      method: 'POST',
      body: { url, ...(slug ? { slug } : {}) },
    })
  } catch (error) {
    if (slug && /already exists|duplicate key|E11000/i.test(error.message)) {
      throw new ApiError('That custom name is already taken. Try another one.', {
        status: error.status,
        field: 'slug',
        cause: error,
      })
    }
    throw error
  }

  let shortUrl
  try {
    shortUrl = new URL(typeof data.shortUrl === 'string' ? data.shortUrl.trim() : '')
    if (!['http:', 'https:'].includes(shortUrl.protocol)) throw new Error('Unsupported short link')
  } catch (error) {
    throw new ApiError('The backend did not return a valid shortened URL.', { cause: error })
  }

  // Also catch a session expiring between /me and /create; never label a random link as custom.
  if (slug && shortUrl.pathname.split('/').filter(Boolean).at(-1) !== slug) {
    throw new ApiError(
      'The backend did not apply your custom name. Sign in again before retrying.',
      { status: 401, field: 'auth' },
    )
  }
  return shortUrl.href
}
