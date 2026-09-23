import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'

function StarPicker({ value, onChange }) {
  return (
    <div className="star-picker" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          className={`star-btn ${n <= value ? 'filled' : ''}`}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function Stars({ value }) {
  return (
    <span className="stars-display" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(value) ? 'star filled' : 'star'}>★</span>
      ))}
    </span>
  )
}

export default function ReviewsSection({ productId }) {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [eligibility, setEligibility] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadReviews = () => {
    api
      .get(`/reviews/product/${productId}`)
      .then((d) => setData(d))
      .catch(() => setError('Could not load reviews.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setLoading(true)
    setError('')
    loadReviews()
    if (user) {
      api
        .get(`/reviews/can-review/${productId}`)
        .then(setEligibility)
        .catch(() => {})
    } else {
      setEligibility(null)
    }
  }, [productId, user])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!rating) {
      setError('Please choose a star rating.')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post('/reviews', { productId, rating, comment })
      setSuccess(res.message || 'Review submitted for approval.')
      setShowForm(false)
      setRating(0)
      setComment('')
      setEligibility({ canReview: false, reason: 'already_reviewed', existingStatus: 'pending' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const breakdown = data?.summary?.breakdown || {}
  const totalReviews = data?.summary?.count || 0

  if (loading) return <section className="reviews-section"><p className="muted">Loading reviews…</p></section>

  return (
    <section className="reviews-section tab-panel">
      <div className="section-heading">
        <h2>Customer reviews</h2>
      </div>

      <div className="reviews-summary">
        <div className="reviews-overall">
          <span className="reviews-avg">{totalReviews ? data.summary.avg : '–'}</span>
          <Stars value={data?.summary?.avg || 0} />
          <span className="muted">{totalReviews ? `${totalReviews} review${totalReviews > 1 ? 's' : ''}` : 'No reviews yet'}</span>
        </div>
        {totalReviews > 0 && (
          <div className="reviews-bars">
            {[5, 4, 3, 2, 1].map((n) => (
              <div key={n} className="reviews-bar-row">
                <span className="bar-label">{n}★</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${totalReviews ? ((breakdown[n] || 0) / totalReviews) * 100 : 0}%` }}
                  />
                </div>
                <span className="bar-count">{breakdown[n] || 0}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Write review CTA */}
      {!user ? (
        <p className="muted reviews-cta">
          <Link to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}>Log in</Link> to review this product
          after purchase.
        </p>
      ) : eligibility?.canReview ? (
        showForm ? (
          <form className="review-form" onSubmit={submit}>
            <h3>Write your review</h3>
            <StarPicker value={rating} onChange={setRating} />
            <textarea
              rows={4}
              maxLength={2000}
              placeholder="Share your experience with this product (optional)…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            {error && <p className="form-error">{error}</p>}
            <div className="btn-row">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit review'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="btn btn-outline" onClick={() => setShowForm(true)}>
            ✍️ Write a review
          </button>
        )
      ) : eligibility?.reason === 'already_reviewed' ? (
        <p className="muted reviews-cta">
          You reviewed this product — your review is{' '}
          <strong>{eligibility.existingStatus === 'pending' ? 'pending approval' : eligibility.existingStatus}</strong>.
        </p>
      ) : null}

      {success && <p className="form-success">{success}</p>}
      {error && !showForm && <p className="form-error">{error}</p>}

      {/* Review list */}
      {totalReviews > 0 ? (
        <div className="reviews-list">
          {data.reviews.map((r) => (
            <div key={r.id} className="review-item">
              <div className="review-head">
                <span className="review-avatar">{(r.customerName || 'C')[0].toUpperCase()}</span>
                <div>
                  <strong>{r.customerName || 'Customer'}</strong>
                  <div className="review-meta">
                    <Stars value={r.rating} />
                    <span className="muted">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              {r.comment && <p className="review-comment">{r.comment}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Be the first to review this product.</p>
      )}
    </section>
  )
}


