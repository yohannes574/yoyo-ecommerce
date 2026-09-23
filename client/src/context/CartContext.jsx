import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api from '../api'
import { useAuth } from './AuthContext'

const EMPTY = { items: [], count: 0, subtotal: 0 }

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [cart, setCart] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await api.get('/api/cart')
      setCart(d.cart)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) refresh()
    else setCart(EMPTY)
  }, [user, refresh])

  const addToCart = async (productId, variantName = '', qty = 1) => {
    setError(null)
    const d = await api.post('/api/cart/items', { productId, variantName, qty })
    setCart(d.cart)
    return d.cart
  }

  const setQty = async (productId, variantName = '', qty) => {
    const d = await api.patch('/api/cart/items', { productId, variantName, qty })
    setCart(d.cart)
    return d.cart
  }

  const removeItem = async (productId, variantName = '') => {
    const d = await api.delete('/api/cart/items', { data: { productId, variantName } })
    setCart(d.cart)
    return d.cart
  }

  const clearCart = async () => {
    const d = await api.delete('/api/cart')
    setCart(d.cart)
    return d.cart
  }

  const value = { cart, loading, error, refresh, addToCart, setQty, removeItem, clearCart }
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)