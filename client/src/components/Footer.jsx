import { Link } from 'react-router-dom'
import { useCategories } from '../context/CategoriesContext'
import { Icon } from './Icons'

export default function Footer() {
  const { categories } = useCategories()

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-col">
          <Link to="/" className="logo">
            <span className="logo-mark">y</span> yoyo
          </Link>
          <p className="footer-tagline">
            Your trusted single-vendor store — electronics, fashion, baby care and more,
            delivered across Ethiopia.
          </p>
          <div className="footer-social">
            <a href="#" aria-label="Facebook"><Icon.Store size={18} /></a>
            <a href="#" aria-label="Instagram"><Icon.Share size={18} /></a>
            <a href="#" aria-label="Contact us"><Icon.Headset size={18} /></a>
            <a href="mailto:hello@yoyo.com" aria-label="Email"><Icon.Mail size={18} /></a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Shop</h4>
          <ul>
            <li>
              <Link to="/shop">All Products</Link>
            </li>
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link to={`/category/${c.slug}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <h4>Help</h4>
          <ul>
            <li><Link to="/help">Help Center</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
            <li><Link to="/delivery-info">Delivery Information</Link></li>
            <li><Link to="/return-policy">Return Policy</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Company</h4>
          <ul>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/terms">Terms &amp; Conditions</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
          </ul>
          <p className="footer-contact">
            <Icon.Mail size={14} /> hello@yoyo.com
            <br />
            <Icon.Phone size={14} /> +251 91 123 4567
            <br />
            <Icon.MapPin size={14} /> Addis Ababa, Ethiopia
          </p>
        </div>
      </div>

      <div className="container footer-payments" style={{ paddingBottom: 18 }}>
        <span className="pay-pill">CASH ON DELIVERY</span>
        <span className="pay-pill">CBE</span>
        <span className="pay-pill">AWASH</span>
        <span className="pay-pill">TELEBIRR</span>
        <span className="pay-pill">CBE BIRR</span>
      </div>

      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} Yoyo. All rights reserved.</p>
      </div>
    </footer>
  )
}
