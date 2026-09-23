import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import ProductCard from './ProductCard'
import Spinner from './Spinner'
import { Icon } from './Icons'

export default function ProductRow({ title, query, viewAllTo, viewAllLabel = 'View all' }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get(`/api/products?${query}&limit=8`)
      .then((d) => {
        if (!cancelled) setProducts(d.products)
      })
      .catch(() => {
        if (!cancelled) setProducts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [query])

  if (loading) return <Spinner />
  if (products.length === 0) return null

  return (
    <section className="home-section">
      <div className="section-heading">
        <div>
          <span className="section-eyebrow">Yoyo Store</span>
          <h2>{title}</h2>
        </div>
        {viewAllTo && (
          <Link to={viewAllTo} className="text-link view-all">
            {viewAllLabel} <Icon.ArrowRight size={16} />
          </Link>
        )}
      </div>
      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}