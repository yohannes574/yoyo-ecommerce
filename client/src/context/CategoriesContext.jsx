import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api'

const CategoriesContext = createContext(null)

export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState([])

  useEffect(() => {
    api
      .get('/api/categories')
      .then((d) => setCategories(d.categories))
      .catch(() => setCategories([]))
  }, [])

  const bySlug = new Map()
  const flat = []
  for (const top of categories) {
    bySlug.set(top.slug, top)
    flat.push(top)
    for (const child of top.children || []) {
      bySlug.set(child.slug, child)
      flat.push(child)
    }
  }

  const value = { categories, bySlug, flat }
  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

export const useCategories = () => useContext(CategoriesContext)