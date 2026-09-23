import { Icon } from './Icons'

/**
 * Shared split layout for auth pages: gradient brand panel (desktop) + form column.
 */
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="logo" style={{ color: '#fff' }}>
            <span className="logo-mark">y</span> yoyo
          </span>
          <h2>Shopping that feels premium.</h2>
          <p>Quality products, honest prices and delivery you can track — across Ethiopia.</p>
          <div className="auth-points">
            <span className="auth-point"><Icon.Truck size={18} /> Fast, trackable delivery</span>
            <span className="auth-point"><Icon.Shield size={18} /> Cash on delivery &amp; secure payment</span>
            <span className="auth-point"><Icon.Refresh size={18} /> 7-day easy returns</span>
          </div>
        </div>
        <div className="auth-form-col">
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  )
}
