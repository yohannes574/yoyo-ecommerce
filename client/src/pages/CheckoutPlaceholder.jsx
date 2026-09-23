import EmptyState from '../components/EmptyState'

export default function CheckoutPlaceholder() {
  return (
    <div className="page container">
      <EmptyState
        title="Checkout is almost here"
        message="The step-by-step checkout (address, delivery, promo code, payment) lands in the next build phase."
        ctaText="Back to my cart"
        ctaTo="/cart"
      />
    </div>
  )
}