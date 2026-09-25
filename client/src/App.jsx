import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/Home'
import Shop from './pages/Shop'
import CategoriesIndex from './pages/CategoriesIndex'
import CategoryPage from './pages/CategoryPage'
import SearchResults from './pages/SearchResults'
import ProductDetails from './pages/ProductDetails'
import CartPage from './pages/CartPage'
import WishlistPage from './pages/WishlistPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderConfirmation from './pages/OrderConfirmation'

// Account Portal Pages
import AccountLayout from './pages/account/AccountLayout'
import Dashboard from './pages/account/Dashboard'
import OrdersList from './pages/account/OrdersList'
import OrderDetail from './pages/account/OrderDetail'
import Addresses from './pages/account/Addresses'
import Profile from './pages/account/Profile'
import Notifications from './pages/account/Notifications'
import SupportCenter from './pages/account/SupportCenter'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import StaticPage from './pages/StaticPage'
import MockPaymentPage from './pages/MockPaymentPage'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/categories" element={<CategoriesIndex />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/product/:slug" element={<ProductDetails />} />

        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wishlist"
          element={
            <ProtectedRoute>
              <WishlistPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/order/:id"
          element={
            <ProtectedRoute>
              <OrderConfirmation />
            </ProtectedRoute>
          }
        />

        {/* Customer Account Portal Nested Routes */}
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<OrdersList />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="addresses" element={<Addresses />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="support" element={<SupportCenter />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="/payment/mock-pay" element={<MockPaymentPage />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/about" element={<StaticPage page="about" />} />
        <Route path="/contact" element={<StaticPage page="contact" />} />
        <Route path="/help" element={<StaticPage page="help" />} />
        <Route path="/faq" element={<StaticPage page="faq" />} />
        <Route path="/terms" element={<StaticPage page="terms" />} />
        <Route path="/privacy" element={<StaticPage page="privacy" />} />
        <Route path="/return-policy" element={<StaticPage page="return-policy" />} />
        <Route path="/delivery-info" element={<StaticPage page="delivery-info" />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}