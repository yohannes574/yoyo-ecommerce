import { Link, useParams } from 'react-router-dom'
import Catalog from '../components/Catalog'
import EmptyState from '../components/EmptyState'
import { useCategories } from '../context/CategoriesContext'

export default function CategoryPage() {
  const { slug } = useParams()
  const { bySlug, categories } = useCategories()
  const cat = bySlug.get(slug)

  if (!cat) {
    return (
      <div className="page container">
        <EmptyState title="Category not found" ctaText="Browse the shop" ctaTo="/shop" />
      </div>
    )
  }

  const isTop = !cat.parent
  const top = isTop ? cat : categories.find((c) => String(c.id) === String(cat.parent))

  // Chip row: when inside a top category we list its subcategories; when viewing
  // a subcategory we prepend an "All {top}" chip that navigates back to the parent.
  const chips = []
  if (isTop) {
    for (const child of top.children || []) chips.push(child)
  } else if (top) {
    chips.push({ _id: top.id, name: `All ${top.name}`, slug: top.slug })
    for (const child of top.children || []) chips.push(child)
  }

  return (
    <div className="page container">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        {!isTop && top && (
          <>
            <Link to={`/category/${top.slug}`}>{top.name}</Link>
            <span>/</span>
          </>
        )}
        <span className="current">{cat.name}</span>
      </nav>

      <div className="page-head">
        <h1>{cat.name}</h1>
        {cat.description && <p>{cat.description}</p>}
      </div>

      {chips.length > 0 && (
        <div className="chip-row">
          {chips.map((c) => (
            <Link
              key={c._id || c.slug}
              to={`/category/${c.slug}`}
              className={`chip ${c.slug === slug ? 'active' : ''}`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      <Catalog key={slug} category={slug} />
    </div>
  )
}