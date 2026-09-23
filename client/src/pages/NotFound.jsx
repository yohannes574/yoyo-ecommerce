import EmptyState from '../components/EmptyState'

export default function NotFound() {
  return (
    <div className="page container">
      <EmptyState title="Page not found" message="That page does not exist or has moved." ctaTo="/" ctaText="Back to home" />
    </div>
  )
}