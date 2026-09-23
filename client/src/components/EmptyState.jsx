import { Link } from 'react-router-dom'

export default function EmptyState({ title, message, ctaText = 'Continue shopping', ctaTo = '/shop' }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 22h36l-3 30a4 4 0 0 1-4 3.6H21a4 4 0 0 1-4-3.6Z" />
          <path d="M23 22v-4a9 9 0 0 1 18 0v4" />
          <circle cx="26" cy="34" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="38" cy="34" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      </div>
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      <Link to={ctaTo} className="btn btn-primary">
        {ctaText}
      </Link>
    </div>
  )
}
