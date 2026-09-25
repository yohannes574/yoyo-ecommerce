import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatETB } from '../utils/format'
import { getImageUrl } from '../utils/imageUrl'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { Icon } from './Icons'

export default function ProductCard({ product }) {
const { user } = useAuth()
const { addToCart } = useCart()
const { inWishlist, toggle } = useWishlist()
const navigate = useNavigate()
const [added, setAdded] = useState(false)
const [err, setErr] = useState('')

const wished = inWishlist(product.id)
const hasVariants = product.variants && product.variants.length > 0
const canAdd = !product.outOfStock && !hasVariants

const productImage = getImageUrl(product.images?.[0])

const onWishlist = async (e) => {
e.preventDefault()


if (!user) {
  navigate(`/login?redirect=${encodeURIComponent(`/product/${product.slug}`)}`)
  return
}

try {
  await toggle(product)
} catch (error) {
  setErr(error.message)
}


}

const onAdd = async (e) => {
e.preventDefault()


if (!user) {
  navigate(`/login?redirect=${encodeURIComponent(`/product/${product.slug}`)}`)
  return
}

try {
  await addToCart(product.id, '', 1)
  setAdded(true)
  setTimeout(() => setAdded(false), 1600)
} catch (error) {
  setErr(error.message)
}


}

return ( <div className="product-card">
<Link to={`/product/${product.slug}`} className="product-card-media">
{productImage ? ( <img
         src={productImage}
         alt={product.name}
         loading="lazy"
       />
) : ( <div className="img-placeholder">No image</div>
)}


    {product.discountPercent > 0 && (
      <span className="discount-badge">
        -{product.discountPercent}%
      </span>
    )}

    {product.outOfStock && (
      <span className="soldout-ribbon">
        Out of stock
      </span>
    )}
  </Link>

  <button
    type="button"
    className={`wish-btn ${wished ? 'wished' : ''}`}
    aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
    onClick={onWishlist}
  >
    {wished ? (
      <Icon.Heart size={17} filled />
    ) : (
      <Icon.Heart size={17} />
    )}
  </button>

  <div className="product-card-body">
    <Link
      to={`/product/${product.slug}`}
      className="product-card-name"
    >
      {product.name}
    </Link>

    <div className="product-card-price">
      <span className="price-now">
        {formatETB(product.salePrice)}
      </span>

      {product.discountPercent > 0 && (
        <span className="price-was">
          {formatETB(product.price)}
        </span>
      )}
    </div>

    <div className="product-card-meta">
      {(product.ratingCount > 0 || product.ratingAvg > 0) && (
        <span
          className="rating-inline"
          title={`${product.ratingAvg} / 5 — ${product.ratingCount} review(s)`}
        >
          <span className="star">
            <Icon.Star size={13} filled />
          </span>{' '}
          {product.ratingAvg}

          <span className="rating-count">
            ({product.ratingCount})
          </span>
        </span>
      )}

      {product.outOfStock ? (
        <span className="stock out">
          Out of stock
        </span>
      ) : product.lowStock ? (
        <span className="stock low">
          Only {product.available} left
        </span>
      ) : (
        <span className="stock in">
          In stock
        </span>
      )}

      {product.brand && (
        <span className="brand">
          {product.brand}
        </span>
      )}
    </div>

    {err && (
      <p className="form-error">
        {err}
      </p>
    )}

    {hasVariants ? (
      <Link
        to={`/product/${product.slug}`}
        className="btn btn-outline btn-block btn-sm"
      >
        Choose options
      </Link>
    ) : (
      <button
        type="button"
        className={`btn ${
          canAdd ? 'btn-primary' : 'btn-disabled'
        } btn-block btn-sm`}
        disabled={!canAdd}
        onClick={onAdd}
      >
        {added ? (
          <>
            <Icon.Check size={15} /> Added to cart
          </>
        ) : product.outOfStock ? (
          'Out of stock'
        ) : (
          'Add to cart'
        )}
      </button>
    )}
  </div>
</div>


)
}
