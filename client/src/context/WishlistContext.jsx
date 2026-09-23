import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api from '../api'
import { useAuth } from './AuthContext'

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.get('/wishlist')
      setProducts(d.wishlist.products)
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) refresh()
    else setProducts([])
  }, [user, refresh])

  const ids = new Set(products.map((p) => String(p.id)))
  const inWishlist = useCallback((productId) => ids.has(String(productId)), [ids])

  const toggle = async (product) => {
    if (String(product.id) && ids.has(String(product.id))) {
      const d = await api.delete(`/wishlist/${product.id}`)
      setProducts(d.wishlist.products)
      return false
    }
    const d = await api.post('/wishlist', { productId: product.id })
    setProducts(d.wishlist.products)
    return true
  }

  const value = { products, loading, ids, inWishlist, toggle, refresh }
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export const useWishlist = () => useContext(WishlistContext)

