import { Link, useSearchParams } from 'react-router-dom'
import Catalog from '../components/Catalog'

export default function SearchResults() {
  const [params] = useSearchParams()
  const q = (params.get('q') || '').trim()

  return (
    <div className="page container">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <span className="current">Search</span>
      </nav>
      <div className="page-head">
        <h1>{q ? `Results for "${q}"` : 'Search'}</h1>
        {q && (
          <p>
            <Link to="/shop" className="text-link">
              Browse all products instead
            </Link>
          </p>
        )}
      </div>
      {q ? (
        <Catalog key={q} search={q} showCategoryFilter />
      ) : (
        <p className="muted">Type a search term in the search box above.</p>
      )}
    </div>
  )
}