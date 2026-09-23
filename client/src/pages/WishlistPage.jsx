import { useWishlist } from '../context/WishlistContext'
import ProductCard from '../components/ProductCard'
import EmptyState from '../components/EmptyState'
import Spinner from '../components/Spinner'

export default function WishlistPage() {
  const { products, loading } = useWishlist()

  if (loading) return <Spinner text="Loading your wishlist…" />

  if (products.length === 0) {
    return (
      <div className="page container">
        <EmptyState
          title="Your wishlist is empty"
          message="Tap the heart on any product to save it here."
        />
      </div>
    )
  }

  return (
    <div className="page container">
      <div className="page-head">
        <h1>My wishlist</h1>
        <p>{products.length} saved product{products.length === 1 ? '' : 's'}</p>
      </div>
      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}