import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { useCategories } from '../context/CategoriesContext'
import { Icon } from './Icons'
import NotificationBell from './NotificationBell'

const ANNOUNCEMENTS = [
  { icon: Icon.Truck, text: 'Fast delivery across Addis Ababa & all regions' },
  { icon: Icon.Refresh, text: '7-day easy returns on every order' },
  { icon: Icon.Shield, text: 'Cash on delivery & secure bank payments' },
]

export default function Header() {
  const { user, logout } = useAuth()
  const { cart } = useCart()
  const { ids } = useWishlist()
  const { categories } = useCategories()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setTick((v) => (v + 1) % ANNOUNCEMENTS.length), 4000)
    return () => clearInterval(t)
  }, [])

  const submitSearch = (e) => {
    e.preventDefault()
    const term = q.trim()
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/shop')
    setQ('')
    setMenuOpen(false)
  }

  return (
    <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="announce-bar" aria-hidden>
        <div className="container announce-inner">
          {ANNOUNCEMENTS.map((a, i) => (
            <span key={i} className={`announce-msg ${i === tick ? 'active' : ''}`}>
              <a.icon size={15} /> {a.text}
            </span>
          ))}
        </div>
      </div>

      <div className="container header-main">
        <button
          className="icon-btn menu-btn"
          aria-label="Menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>

        <Link to="/" className="logo" onClick={() => setMenuOpen(false)}>
          <span className="logo-mark">y</span> yoyo
        </Link>

        <nav className={`header-nav ${menuOpen ? 'open' : ''}`}>
          <NavLink to="/" end onClick={() => setMenuOpen(false)}>
            Home
          </NavLink>
          <div
            className="has-dropdown"
            onMouseEnter={() => setCatOpen(true)}
            onMouseLeave={() => setCatOpen(false)}
          >
            <button type="button" className="nav-link-btn" onClick={() => setCatOpen(!catOpen)}>
              Categories <Icon.ChevronDown size={14} />
            </button>
            {catOpen && (
              <div className="dropdown">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    to={`/category/${c.slug}`}
                    className="dropdown-item"
                    onClick={() => {
                      setCatOpen(false)
                      setMenuOpen(false)
                    }}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <NavLink to="/shop" onClick={() => setMenuOpen(false)}>
            Shop
          </NavLink>
          {user && (
            <NavLink to="/account" className="mobile-only" onClick={() => setMenuOpen(false)}>
              My Account
            </NavLink>
          )}
        </nav>

        <form className="search-box" onSubmit={submitSearch}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
          />
          <button type="submit" className="icon-btn" aria-label="Search">
            <Icon.Search size={19} />
          </button>
        </form>

        <div className="header-actions">
          <NotificationBell />
          {user ? (
            <div className="account-menu">
              <span className="account-name" title={user.name}>
                Hi, {user.name.split(' ')[0]}
              </span>
              <Link to="/account" className="text-link desktop-only">
                My Account
              </Link>
              <button type="button" className="text-link" onClick={() => { logout(); navigate('/') }}>
                Sign out
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
          )}

          <Link to="/wishlist" className="icon-link" aria-label="Wishlist">
            <Icon.Heart size={21} />
            {ids.size > 0 && <span className="badge">{ids.size}</span>}
          </Link>

          <Link to="/cart" className="icon-link" aria-label="Cart">
            <Icon.Cart size={21} />
            {cart.count > 0 && (
              <span key={cart.count} className="badge pop">
                {cart.count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
