import { Link } from 'react-router-dom'
import { formatETB } from '../utils/format'
import { getImageUrl } from '../utils/imageUrl'
import { useCart } from '../context/CartContext'
import EmptyState from '../components/EmptyState'
import Spinner from '../components/Spinner'

export default function CartPage() {
const { cart, loading, setQty, removeItem } = useCart()

if (loading) {
return <Spinner text="Loading your cart…" />
}

if (cart.items.length === 0) {
return ( <div className="page container"> <EmptyState
       title="Your cart is empty"
       message="Add a few products and they will show up here."
     /> </div>
)
}

return ( <div className="page container"> <div className="page-head"> <h1>My cart</h1> <p>
{cart.count} item{cart.count === 1 ? '' : 's'} </p> </div>

```
  <div className="cart-layout">
    <div className="cart-items">
      {cart.items.map((item) => {
        const p = item.product
        const productImage = getImageUrl(p.images?.[0])

        return (
          <div
            className="cart-item"
            key={`${p.id}-${item.variantName}`}
          >
            <Link
              to={`/product/${p.slug}`}
              className="cart-item-img"
            >
              {productImage ? (
                <img
                  src={productImage}
                  alt={p.name}
                />
              ) : (
                <div className="img-placeholder">
                  No image
                </div>
              )}
            </Link>

            <div className="cart-item-info">
              <Link
                to={`/product/${p.slug}`}
                className="cart-item-name"
              >
                {p.name}
              </Link>

              {item.variantName && (
                <p className="cart-item-variant">
                  Option: {item.variantName}
                </p>
              )}

              {item.available < item.qty && (
                <p className="stock low">
                  Only {item.available} available — quantity reduced
                </p>
              )}

              <p className="cart-item-price">
                {formatETB(item.price)} each
              </p>
            </div>

            <div className="cart-item-controls">
              <div className="stepper-wrap">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() =>
                    setQty(
                      p.id,
                      item.variantName,
                      item.qty - 1
                    )
                  }
                  disabled={item.qty <= 1}
                >
                  −
                </button>

                <span>{item.qty}</span>

                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() =>
                    setQty(
                      p.id,
                      item.variantName,
                      item.qty + 1
                    )
                  }
                  disabled={
                    item.qty >=
                    Math.min(item.available || 1, 99)
                  }
                >
                  +
                </button>
              </div>

              <p className="cart-item-total">
                {formatETB(item.lineTotal)}
              </p>

              <button
                type="button"
                className="text-link danger"
                onClick={() =>
                  removeItem(p.id, item.variantName)
                }
              >
                Remove
              </button>
            </div>
          </div>
        )
      })}
    </div>

    <aside className="order-summary">
      <h3>Order summary</h3>

      <div className="summary-row">
        <span>Subtotal</span>
        <strong>
          {formatETB(cart.subtotal)}
        </strong>
      </div>

      <div className="summary-row muted-row">
        <span>Delivery fee</span>
        <span>At checkout</span>
      </div>

      <div className="summary-row muted-row">
        <span>Promo code</span>
        <span>At checkout</span>
      </div>

      <hr />

      <div className="summary-row">
        <span>Total</span>
        <strong>
          {formatETB(cart.subtotal)}
        </strong>
      </div>

      <Link
        to="/checkout"
        className="btn btn-primary btn-block"
      >
        Proceed to checkout →
      </Link>

      <Link
        to="/shop"
        className="btn btn-ghost btn-block"
      >
        Continue shopping
      </Link>
    </aside>
  </div>
</div>


)
}
