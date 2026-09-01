// Thin fetch client for the MDMIS Django backend (see ../backend).
// Handles JWT access/refresh token storage and silent refresh-on-401.

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

const ACCESS_KEY = 'mdmis_access_token'
const REFRESH_KEY = 'mdmis_refresh_token'

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken()
  if (!refresh) return null
  const res = await fetch(`${API_URL}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  if (!res.ok) {
    clearTokens()
    return null
  }
  const data = await res.json()
  localStorage.setItem(ACCESS_KEY, data.access)
  if (data.refresh) localStorage.setItem(REFRESH_KEY, data.refresh)
  return data.access as string
}

function extractMessage(body: unknown): string {
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>
    if (typeof obj.detail === 'string') return obj.detail
    const firstKey = Object.keys(obj)[0]
    if (firstKey) {
      const val = obj[firstKey]
      if (Array.isArray(val) && typeof val[0] === 'string') return val[0]
      if (typeof val === 'string') return val
    }
  }
  return 'Request failed'
}

/**
 * Authenticated JSON fetch. Attaches the access token, retries once after a
 * silent refresh on 401, and throws ApiError with a readable message on
 * any non-2xx response.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  { auth = true }: { auth?: boolean } = {},
): Promise<T> {
  const doFetch = async (): Promise<Response> => {
    const headers = new Headers(options.headers)
    headers.set('Content-Type', 'application/json')
    if (auth) {
      const token = getAccessToken()
      if (token) headers.set('Authorization', `Bearer ${token}`)
    }
    return fetch(`${API_URL}${path}`, { ...options, headers })
  }

  let res = await doFetch()

  if (res.status === 401 && auth && getRefreshToken()) {
    const newAccess = await refreshAccessToken()
    if (newAccess) res = await doFetch()
  }

  if (!res.ok) {
    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      // no JSON body
    }
    throw new ApiError(res.status, extractMessage(body), body)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
