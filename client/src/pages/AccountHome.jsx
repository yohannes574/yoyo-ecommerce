import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AccountHome() {
  const { user } = useAuth()

  return (
    <div className="page container">
      <div className="page-head">
        <h1>My account</h1>
        <p>Hello, {user?.name}</p>
      </div>
      <div className="account-placeholder card">
        <p>
          Your full dashboard — orders, addresses, profile and checkout — arrives in the next
          build phase. In the meantime:
        </p>
        <div className="btn-row">
          <Link to="/cart" className="btn btn-primary">View my cart</Link>
          <Link to="/wishlist" className="btn btn-outline">View my wishlist</Link>
          <Link to="/shop" className="btn btn-ghost">Continue shopping</Link>
        </div>
      </div>
    </div>
  )
}