import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ugc_token') || '')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  async function api(path, opts = {}) {
    const headers = { ...(opts.headers || {}) }
    if (token) headers['Authorization'] = `Bearer ${token}`
    if (!(opts.body instanceof FormData) && opts.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }
    const res = await fetch(`/api${path}`, { ...opts, headers })
    const isJson = res.headers.get('content-type')?.includes('application/json')
    const data = isJson ? await res.json() : await res.text()
    if (!res.ok) {
      const msg = (data && data.error) ? data.error : `Request failed (${res.status})`
      throw new Error(msg)
    }
    return data
  }

  async function login(username, password) {
    setLoading(true)
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      })
      localStorage.setItem('ugc_token', data.token)
      setToken(data.token)
      setUser(data.user)
      return data.user
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('ugc_token')
    setToken('')
    setUser(null)
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!token) return
      try {
        const me = await api('/me')
        if (!cancelled) setUser(me)
      } catch (e) {
        localStorage.removeItem('ugc_token')
        if (!cancelled) {
          setToken('')
          setUser(null)
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [token])

  const value = useMemo(() => ({ token, user, loading, login, logout, api }), [token, user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
