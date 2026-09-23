import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import { formatETB } from '../utils/format'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { Icon } from '../components/Icons'
import { useWishlist } from '../context/WishlistContext'
import ProductCard from '../components/ProductCard'
import ReviewsSection from '../components/ReviewsSection'
import QuantityStepper from '../components/QuantityStepper'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'

export default function ProductDetails() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { addToCart } = useCart()
  const { inWishlist, toggle } = useWishlist()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [variantName, setVariantName] = useState('')
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    api
      .get(`/api/products/${slug}`)
      .then((d) => {
        if (cancelled) return
        setProduct(d.product)
        setRelated(d.related)
        setActiveImg(0)
        setVariantName(d.product.variants?.[0]?.name || '')
        setQty(1)
      })
      .catch((e) => {
        if (!cancelled && e.status === 404) setNotFound(true)
        else if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const variant = useMemo(
    () => (product?.variants || []).find((v) => v.name === variantName) || null,
    [product, variantName]
  )

  const available = useMemo(() => {
    if (!product) return 0
    return variant ? Math.max(0, variant.stock) : product.available
  }, [product, variant])

  // Reset quantity if it exceeds available stock
  useEffect(() => {
    if (available > 0 && qty > available) setQty(available)
    if (available === 0) setQty(1)
  }, [available, qty])

  if (loading) return <Spinner />
  if (notFound) {
    return (
      <div className="page container">
        <EmptyState title="Product not found" message="It may have been removed or is no longer for sale." />
      </div>
    )
  }
  if (!product) {
    return (
      <div className="page container">
        <p className="form-error">{error || 'Could not load this product.'}</p>
      </div>
    )
  }

  const unitPrice = variant?.price || product.price
  const unitSale = product.discountPercent > 0
    ? Math.round(unitPrice * (1 - product.discountPercent / 100))
    : unitPrice
  const wished = inWishlist(product.id)

  const requireLogin = () => {
    navigate(`/login?redirect=${encodeURIComponent(`/product/${product.slug}`)}`)
  }

  const onWishlist = async () => {
    if (!user) return requireLogin()
    try {
      await toggle(product)
    } catch (e) {
      setError(e.message)
    }
  }

  const doAdd = async () => {
    setBusy('cart')
    setError('')
    setNotice('')
    try {
      await addToCart(product.id, variantName, qty)
      setNotice(`${product.name} added to cart.`)
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      setBusy('')
    }
  }

  const onAddToCart = async () => {
    if (!user) return requireLogin()
    if (available <= 0) return
    await doAdd()
  }

  const onBuyNow = async () => {
    if (!user) return requireLogin()
    if (available <= 0) return
    if (await doAdd()) navigate('/cart')
  }

  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Could not copy the link')
    }
  }

  const shareUrl = encodeURIComponent(window.location.href)
  const stockLabel = product.outOfStock
    ? 'Out of stock'
    : available <= product.lowStockThreshold
      ? `Only ${available} left — order soon`
      : 'In stock'

  const specEntries = Object.entries(product.specifications || {})

  return (
    <div className="page container">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        {product.category && (
          <>
            <Link to={`/category/${product.category.slug}`}>{product.category.name}</Link>
            <span>/</span>
          </>
        )}
        <span className="current">{product.name}</span>
      </nav>

      {notice && <p className="form-success">{notice}</p>}
      {error && <p className="form-error">{error}</p>}

      <div className="product-detail">
        <div className="product-gallery">
          {product.images?.length > 0 ? (
            <>
              <div className="gallery-main">
                <img src={product.images[activeImg] || product.images[0]} alt={product.name} />
                {product.discountPercent > 0 && (
                  <span className="discount-badge">-{product.discountPercent}%</span>
                )}
              </div>
              {product.images.length > 1 && (
                <div className="gallery-thumbs">
                  {product.images.map((img, i) => (
                    <button
                      type="button"
                      key={img + i}
                      className={`thumb ${i === activeImg ? 'active' : ''}`}
                      onClick={() => setActiveImg(i)}
                    >
                      <img src={img} alt={`${product.name} ${i + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="img-placeholder big">No image available</div>
          )}
        </div>

        <div className="product-info">
          {product.brand && <p className="product-brand">{product.brand}</p>}
          <h1 className="product-title">{product.name}</h1>

          <div className="product-price-block">
            <span className="price-now big">{formatETB(unitSale)}</span>
            {product.discountPercent > 0 && (
              <span className="price-was big">{formatETB(unitPrice)}</span>
            )}
            <span className={`stock ${product.outOfStock ? 'out' : available <= product.lowStockThreshold ? 'low' : 'in'}`}>
              {stockLabel}
            </span>
          </div>

          <a className="rating-summary-link" href="#reviews">
            {product.ratingCount > 0 ? (
              <>
                <span className="rating-inline big">
                  <span className="star filled">★</span> {product.ratingAvg}
                  <span className="rating-count">({product.ratingCount} review{product.ratingCount > 1 ? 's' : ''})</span>
                </span>
              </>
            ) : (
              <span className="muted">No reviews yet</span>
            )}
          </a>

          {product.variants?.length > 0 && (
            <div className="variant-group">
              <p className="variant-label">
                Options: <strong>{variantName || 'Select one'}</strong>
              </p>
              <div className="variant-pills">
                {product.variants.map((v) => (
                  <button
                    type="button"
                    key={v.id}
                    className={`variant-pill ${v.name === variantName ? 'active' : ''}`}
                    onClick={() => setVariantName(v.name)}
                  >
                    {v.name}
                    {v.stock <= 0 ? ' (sold out)' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.outOfStock || available <= 0 ? (
            <p className="muted">This item is currently unavailable.</p>
          ) : (
            <div className="buy-row">
              <QuantityStepper value={qty} onChange={setQty} max={Math.min(available, 99)} />
              <button
                type="button"
                className="btn btn-primary"
                onClick={onAddToCart}
                disabled={busy === 'cart'}
              >
                {busy === 'cart' ? 'Adding…' : 'Add to cart'}
              </button>
              <button type="button" className="btn btn-dark" onClick={onBuyNow} disabled={busy === 'cart'}>
                Buy now
              </button>
            </div>
          )}

          <div className="action-row">
            <button type="button" className={`btn btn-outline btn-sm ${wished ? 'wished' : ''}`} onClick={onWishlist}>
              <Icon.Heart size={15} filled={wished} /> {wished ? 'In wishlist' : 'Add to wishlist'}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={onShare}>
              {copied ? (<><Icon.Check size={15} /> Link copied</>) : (<><Icon.Share size={15} /> Share</>)}
            </button>
            <div className="share-links">
              <a href={`https://wa.me/?text=${shareUrl}`} target="_blank" rel="noreferrer" title="Share on WhatsApp">
                WhatsApp
              </a>
              <a href={`https://t.me/share/url?url=${shareUrl}`} target="_blank" rel="noreferrer" title="Share on Telegram">
                Telegram
              </a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noreferrer" title="Share on Facebook">
                Facebook
              </a>
            </div>
          </div>

          <div className="trust-row">
            <span><Icon.Truck size={16} /> Delivery across Addis Ababa &amp; regions</span>
            <span><Icon.Shield size={16} /> Cash on delivery &amp; bank transfer</span>
          </div>
        </div>
      </div>

      <div className="product-tabs">
        <section className="tab-panel">
          <h2>Description</h2>
          <p className="product-description">{product.description || 'No description provided.'}</p>
        </section>

        {specEntries.length > 0 && (
          <section className="tab-panel">
            <h2>Specifications</h2>
            <table className="spec-table">
              <tbody>
                {specEntries.map(([k, v]) => (
                  <tr key={k}>
                    <th>{k}</th>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>

      <div id="reviews">
        <ReviewsSection productId={product.id} />
      </div>

      {related.length > 0 && (
        <section className="home-section">
          <div className="section-heading">
            <h2>Related products</h2>
            <Link to={`/category/${product.category?.slug}`} className="text-link">
              More in {product.category?.name} →
            </Link>
          </div>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}