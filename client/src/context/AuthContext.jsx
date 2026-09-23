import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api from '../api'

const TOKEN_KEY = 'yoyo_token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }
    api
      .get('/auth/me')
      .then((d) => setUser(d.customer))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  const applySession = useCallback((token, customer) => {
    localStorage.setItem(TOKEN_KEY, token)
    setUser(customer)
  }, [])

  const register = async (payload) => {
    const d = await api.post('/auth/register', payload)
    return d
  }

  const verify = async (email, code) => {
    const d = await api.post('/auth/verify', { email, code })
    applySession(d.token, d.customer)
    return d.customer
  }

  const resendCode = async (email) => {
    const d = await api.post('/auth/resend-code', { email })
    return d.message
  }

  const login = async (identifier, password) => {
    const d = await api.post('/auth/login', { identifier, password })
    applySession(d.token, d.customer)
    return d.customer
  }

  const forgotPassword = async (email) => {
    const d = await api.post('/auth/forgot-password', { email })
    return d.message
  }

  const resetPassword = async (email, code, password) => {
    const d = await api.post('/auth/reset-password', { email, code, password })
    return d.message
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  const value = {
    user,
    loading,
    register,
    verify,
    resendCode,
    login,
    logout,
    forgotPassword,
    resetPassword,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
