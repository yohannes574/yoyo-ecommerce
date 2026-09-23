import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCategories } from '../context/CategoriesContext'
import ProductRow from '../components/ProductRow'
import { Icon } from '../components/Icons'
import api from '../api'

export default function Home() {
  const { categories } = useCategories()
  const [banners, setBanners] = useState([])
  const [sections, setSections] = useState({})

  useEffect(() => {
    api
      .get('/content')
      .then((d) => {
        setBanners(d.banners || [])
        setSections(d.sections || {})
      })
      .catch(() => {})
  }, [])

  const banner = banners[0]

  return (
    <div className="home">
      {banner ? (
        <section className="hero banner-hero" style={banner.image ? { backgroundImage: `url(${banner.image})` } : undefined}>
          <div className="container hero-inner">
            <div className="hero-copy">
              <h1>{banner.title}</h1>
              {banner.subtitle && <p>{banner.subtitle}</p>}
              <div className="hero-actions">
                <Link to={banner.link || '/shop'} className="btn btn-light">
                  {banner.cta || 'Shop now'}
                </Link>
              </div>
              <div className="hero-chips">
                <span className="hero-chip"><Icon.Truck size={17} /> Fast delivery</span>
                <span className="hero-chip"><Icon.Shield size={17} /> Secure payment</span>
                <span className="hero-chip"><Icon.Refresh size={17} /> 7-day returns</span>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="hero">
          <div className="container hero-inner">
            <div className="hero-copy">
              <h1>Discover our products</h1>
              <p>
                Electronics, fashion, baby care, chicken equipment and more —
                quality products delivered across Ethiopia.
              </p>
              <div className="hero-actions">
                <Link to="/shop" className="btn btn-light">
                  Shop now
                </Link>
                <Link to="/categories" className="btn btn-outline-light">
                  Browse categories
                </Link>
              </div>
              <div className="hero-chips">
                <span className="hero-chip"><Icon.Truck size={17} /> Fast delivery</span>
                <span className="hero-chip"><Icon.Shield size={17} /> Secure payment</span>
                <span className="hero-chip"><Icon.Refresh size={17} /> 7-day returns</span>
              </div>
            </div>
            <div className="hero-art" aria-hidden>
              🛒
            </div>
          </div>
        </section>
      )}

      <div className="container home-body">
        {sections.showCategories !== false && (
          <section className="home-section">
            <div className="section-heading">
              <div>
                <span className="section-eyebrow">Browse</span>
                <h2>Categories</h2>
              </div>
              <Link to="/categories" className="text-link view-all">
                All categories <Icon.ArrowRight size={16} />
              </Link>
            </div>
            <div className="category-cards">
              {categories.map((c) => (
                <Link key={c.id} to={`/category/${c.slug}`} className="category-card">
                  <span className="category-card-emoji" aria-hidden>
                    {c.emoji || '📦'}
                  </span>
                  <span className="category-card-name">{c.name}</span>
                  <span className="category-card-sub">
                    {c.children?.length || 0} subcategories
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {sections.showNewArrivals !== false && (
          <ProductRow
            title="New arrivals"
            query="sort=new_arrivals"
            viewAllTo="/shop?sort=new_arrivals"
          />
        )}

        {sections.showBestSellers !== false && (
          <ProductRow
            title="Best sellers"
            query="sort=best_selling"
            viewAllTo="/shop?sort=best_selling"
          />
        )}

        {sections.showFeatured !== false && (
          <ProductRow title="Featured products" query="sort=featured" viewAllTo="/shop?sort=featured" />
        )}

        <ProductRow
          title="Special offers"
          query="sort=newest"
          viewAllTo="/shop"
          viewAllLabel="View all products"
        />

        <section className="promo-strip">
          <div>
            <h3>Have a promo code?</h3>
            <p>Enter it at checkout — codes like <strong>YOYO10</strong> unlock instant discounts.</p>
          </div>
          <Link to="/shop" className="btn btn-light">
            Start shopping <Icon.ArrowRight size={16} />
          </Link>
        </section>
      </div>
    </div>
  )
}
