'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { RoleUser } from '@/lib/rbac'
import { apiFetch, ApiError, setTokens, clearTokens, getAccessToken } from '@/lib/api'

// Login is normally a one-step, password-only sign-in. The only time it
// resolves to `verified: false` is the edge case where someone registered
// or accepted an invite but never finished the one-time-code step — in
// that case the backend re-sends a code and the caller should fall into
// the same verifyOtp() flow used right after account creation.
type LoginResult = { verified: true } | { verified: false; email: string }

interface AuthContextType {
  isAuthenticated: boolean
  user: RoleUser | null
  login: (email: string, password: string) => Promise<LoginResult>
  verifyOtp: (email: string, code: string) => Promise<void>
  resendOtp: (email: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const USER_CACHE_KEY = 'mdmis_user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<RoleUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Rehydrate session from a stored access token + cached profile, then
  // confirm against the backend (GET /api/auth/me/) in case the role or
  // profile changed since the last visit.
  useEffect(() => {
    async function rehydrate() {
      const token = getAccessToken()
      const cached = sessionStorage.getItem(USER_CACHE_KEY)
      if (!token || !cached) {
        setIsLoading(false)
        return
      }
      try {
        const cachedUser = JSON.parse(cached) as RoleUser
        setUser(cachedUser)
        setIsAuthenticated(true)
      } catch {
        sessionStorage.removeItem(USER_CACHE_KEY)
      }

      try {
        const freshUser = await apiFetch<RoleUser>('/auth/me/')
        setUser(freshUser)
        setIsAuthenticated(true)
        sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(freshUser))
      } catch {
        // Refresh token also expired/invalid — clear the stale session.
        clearTokens()
        sessionStorage.removeItem(USER_CACHE_KEY)
        setUser(null)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }
    rehydrate()
  }, [])

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const data = await apiFetch<
        { access: string; refresh: string; user: RoleUser } | { verification_required: true; email: string }
      >(
        '/auth/login/',
        { method: 'POST', body: JSON.stringify({ email, password }) },
        { auth: false },
      )
      if ('verification_required' in data) {
        return { verified: false, email: data.email }
      }
      setTokens(data.access, data.refresh)
      sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(data.user))
      setUser(data.user)
      setIsAuthenticated(true)
      return { verified: true }
    } catch (err) {
      if (err instanceof ApiError) throw new Error(err.message)
      throw err
    }
  }

  const verifyOtp = async (email: string, code: string) => {
    try {
      const data = await apiFetch<{ access: string; refresh: string; user: RoleUser }>(
        '/auth/verify-otp/',
        { method: 'POST', body: JSON.stringify({ email, code }) },
        { auth: false },
      )
      setTokens(data.access, data.refresh)
      sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(data.user))
      setUser(data.user)
      setIsAuthenticated(true)
    } catch (err) {
      if (err instanceof ApiError) throw new Error(err.message)
      throw err
    }
  }

  const resendOtp = async (email: string) => {
    try {
      await apiFetch(
        '/auth/resend-otp/',
        { method: 'POST', body: JSON.stringify({ email }) },
        { auth: false },
      )
    } catch (err) {
      if (err instanceof ApiError) throw new Error(err.message)
      throw err
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    setUser(null)
    clearTokens()
    sessionStorage.removeItem(USER_CACHE_KEY)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, verifyOtp, resendOtp, logout }}>
      {isLoading ? null : children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
