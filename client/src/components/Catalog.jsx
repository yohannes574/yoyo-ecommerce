import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api'
import ProductCard from './ProductCard'
import Spinner from './Spinner'
import EmptyState from './EmptyState'
import { useCategories } from '../context/CategoriesContext'

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'best_selling', label: 'Best Selling' },
]

export default function Catalog({ category, search, showCategoryFilter = false }) {
  const { categories } = useCategories()
  const [params] = useSearchParams()
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [sort, setSort] = useState(params.get('sort') || 'newest')
  const [catFilter, setCatFilter] = useState(category || params.get('category') || '')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [inStock, setInStock] = useState(false)

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (catFilter) p.set('category', catFilter)
    if (sort) p.set('sort', sort)
    if (minPrice) p.set('minPrice', minPrice)
    if (maxPrice) p.set('maxPrice', maxPrice)
    if (inStock) p.set('inStock', 'true')
    p.set('page', String(page))
    p.set('limit', '24')
    return p.toString()
  }, [search, catFilter, sort, minPrice, maxPrice, inStock, page])

  useEffect(() => {
    setPage(1)
  }, [catFilter, sort, minPrice, maxPrice, inStock, category, search])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .get(`/products?${qs}`)
      .then((d) => {
        if (cancelled) return
        setProducts(d.products)
        setTotal(d.total)
        setPage(d.page)
        setPages(d.pages)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [qs])

  const clearFilters = () => {
    setCatFilter(category || '')
    setMinPrice('')
    setMaxPrice('')
    setInStock(false)
    setSort('newest')
  }

  const hasFilters = catFilter !== (category || '') || minPrice || maxPrice || inStock || sort !== 'newest'

  return (
    <div className="catalog">
      <aside className="catalog-filters">
        <h3>Filters</h3>

        {showCategoryFilter && (
          <div className="filter-group">
            <label htmlFor="cat-filter">Category</label>
            <select
              id="cat-filter"
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <label>Price (ETB)</label>
          <div className="price-range">
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              min="0"
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <span>—</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              min="0"
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label className="checkbox-line">
            <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
            In stock only
          </label>
        </div>

        {hasFilters && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </aside>

      <section className="catalog-results">
        <div className="catalog-toolbar">
          <p className="result-count">
            {loading ? 'Loading…' : `${total} product${total === 1 ? '' : 's'}`}
          </p>
          <div className="sort-box">
            <label htmlFor="sort-select">Sort</label>
            <select id="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="form-error">{error}</p>
        ) : products.length === 0 ? (
          <EmptyState
            title="No products found"
            message="Try adjusting your search or filters."
            ctaText="Clear filters"
            ctaTo="/shop"
          />
        ) : (
          <>
            <div className="product-grid">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            {pages > 1 && (
              <nav className="pagination" aria-label="Pagination">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  ‹ Prev
                </button>
                <span className="page-info">
                  Page {page} of {pages}
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={page >= pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next ›
                </button>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  )
}
