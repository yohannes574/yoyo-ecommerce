import { Link } from 'react-router-dom'
import { useCategories } from '../context/CategoriesContext'
import { Icon } from '../components/Icons'

export default function CategoriesIndex() {
  const { categories } = useCategories()

  return (
    <div className="page container">
      <div className="page-head">
        <h1>Categories</h1>
        <p>Shop by department.</p>
      </div>
      <div className="category-cards">
        {categories.map((c) => (
          <Link key={c.id} to={`/category/${c.slug}`} className="category-card">
            <span className="category-card-emoji" aria-hidden>
              <Icon.Store size={26} />
            </span>
            <span className="category-card-name">{c.name}</span>
            <span className="category-card-sub">
              {(c.children || []).map((s) => s.name).join(' · ') || 'Browse products'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}