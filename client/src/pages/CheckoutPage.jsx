import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { Icon } from '../components/Icons'
import api from '../api'

const REGIONS = [
  'Addis Ababa',
  'Dire Dawa',
  'Oromia',
  'Amhara',
  'Sidama',
  'Tigray',
  'Somali',
  'Afar',
  'Benishangul-Gumuz',
  'Gambela',
  'South Ethiopia',
  'Central Ethiopia',
  'Harari',
]

const BANKS = [
  { id: 'cbe', name: 'Commercial Bank of Ethiopia (CBE)', account: '1000 2345 6789 0', holder: 'Yoyo E-Commerce PLC' },
  { id: 'awash', name: 'Awash Bank', account: '0130 4876 5432 00', holder: 'Yoyo E-Commerce PLC' },
  { id: 'telebirr', name: 'Telebirr SuperApp', account: '0911 00 22 33', holder: 'Yoyo Store' },
  { id: 'cbebirr', name: 'CBE Birr', account: '0911 00 22 33', holder: 'Yoyo Store' },
]

export default function CheckoutPage() {
  const { user } = useAuth()
  const { cart, refresh: refreshCart } = useCart()
  const navigate = useNavigate()

  // Steps: 1 = Address, 2 = Delivery & Promo, 3 = Payment, 4 = Review
  const [step, setStep] = useState(1)

  // Address State
  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    fullName: user?.name || '',
    phone: user?.phone || '',
    region: 'Addis Ababa',
    city: 'Addis Ababa',
    subCity: '',
    woreda: '',
    address: '',
    deliveryInstructions: '',
    isDefault: true,
  })

  // Delivery & Promo State
  const [deliveryMethod, setDeliveryMethod] = useState('standard')
  // Quote for the selected address: BOTH method prices at once
  // (express === null means the zone has no express service)
  const [quotes, setQuotes] = useState({ standard: null, express: null, expressAvailable: true, standardEta: '2–3' })
  const [mobilePay, setMobilePay] = useState({ enabled: false, providers: [], mode: 'mock' })
  const [promoInput, setPromoInput] = useState('')
  const [appliedPromo, setAppliedPromo] = useState(null)
  const [promoError, setPromoError] = useState('')
  const [validatingPromo, setValidatingPromo] = useState(false)

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery')
  const [selectedBank, setSelectedBank] = useState('cbe')
  const [receiptUrl, setReceiptUrl] = useState('')
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [receiptError, setReceiptError] = useState('')

  // Submission State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load saved addresses
  const loadAddresses = async () => {
    try {
      const res = await api.get('/api/addresses')
      const list = res.addresses || []
      setAddresses(list)
      if (list.length > 0) {
        const def = list.find((a) => a.isDefault) || list[0]
        setSelectedAddressId(def.id)
        setShowNewAddressForm(false)
      } else {
        setShowNewAddressForm(true)
      }
    } catch (err) {
      console.error('Failed to load addresses:', err)
      setShowNewAddressForm(true)
    }
  }

  useEffect(() => {
    loadAddresses()
    api
      .get('/api/payments/config')
      .then((d) => setMobilePay({ enabled: !!d.enabled, providers: d.providers || [], mode: d.mode }))
      .catch(() => {})
  }, [])

  // Create new address handler
  const handleSaveAddress = async (e) => {
    e.preventDefault()
    setError('')
    if (!newAddress.fullName || !newAddress.phone || !newAddress.city || !newAddress.address) {
      setError('Please fill in all required address fields (Name, Phone, City, Street/House).')
      return
    }

    try {
      setLoading(true)
      const res = await api.post('/api/addresses', newAddress)
      await loadAddresses()
      if (res.address?.id) {
        setSelectedAddressId(res.address.id)
      }
      setShowNewAddressForm(false)
    } catch (err) {
      setError(err.message || 'Failed to save address')
    } finally {
      setLoading(false)
    }
  }

  // Promo code validation
  const handleApplyPromo = async (e) => {
    e.preventDefault()
    if (!promoInput.trim()) return
    setPromoError('')
    setValidatingPromo(true)
    try {
      const res = await api.post('/api/checkouts/validate-promo', { promoCode: promoInput.trim() })
      setAppliedPromo(res.promo)
      setPromoError('')
    } catch (err) {
      setAppliedPromo(null)
      setPromoError(err.message || 'Invalid promo code')
    } finally {
      setValidatingPromo(false)
    }
  }

  const handleRemovePromo = () => {
    setAppliedPromo(null)
    setPromoInput('')
    setPromoError('')
  }

  // Receipt file upload
  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptError('')
    setUploadingReceipt(true)

    const formData = new FormData()
    formData.append('receipt', file)

    try {
      const res = await api.post('/api/checkouts/upload-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setReceiptUrl(res.url)
    } catch (err) {
      setReceiptError(err.message || 'Failed to upload receipt. Please try an image under 5MB.')
    } finally {
      setUploadingReceipt(false)
    }
  }

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId)

  // Fee for the currently selected method (drives totals, summary, review)
  const deliveryFee = (deliveryMethod === 'express' ? quotes.express : quotes.standard) ?? 0
  const feeLabel = (fee) => (fee == null ? '…' : fee === 0 ? 'Free' : `${fee.toLocaleString()} ETB`)
  const etaLabel = (eta) => (eta === '1' ? '1 business day' : `${eta} business days`)

  // Calculations
  const subtotal = cart.subtotal || 0
  const discountAmount = appliedPromo ? appliedPromo.discount : 0
  const totalAmount = Math.max(0, subtotal - discountAmount + deliveryFee)

  // Live delivery quotes from the server (zone-aware, free-threshold aware).
  // One request returns standard + express so each option card shows its own price.
  useEffect(() => {
    let cancelled = false
    const addr = selectedAddress
    if (!addr) {
      setQuotes({ standard: null, express: null, expressAvailable: true, standardEta: '2–3' })
      return
    }
    api
      .get(
        `/api/delivery/quote?city=${encodeURIComponent(addr.city || '')}&subCity=${encodeURIComponent(addr.subCity || '')}&subtotal=${subtotal}`
      )
      .then((res) => {
        if (!cancelled)
          setQuotes({
            standard: res.standard ?? 0,
            express: res.express,
            expressAvailable: res.expressAvailable !== false,
            standardEta: res.standardEta || '2–3',
          })
      })
      .catch(() => {
        // API unreachable — sane fallbacks so checkout still works
        if (!cancelled) setQuotes({ standard: 100, express: 250, expressAvailable: true, standardEta: '2–3' })
      })
    return () => {
      cancelled = true
    }
  }, [selectedAddress?.id, selectedAddress?.city, selectedAddress?.subCity, subtotal])

  // If the selected zone has no express service, fall back to standard
  useEffect(() => {
    if (deliveryMethod === 'express' && !quotes.expressAvailable) setDeliveryMethod('standard')
  }, [deliveryMethod, quotes.expressAvailable])

  // Step validation
  const canGoToStep2 = selectedAddressId || (showNewAddressForm && newAddress.fullName && newAddress.address)
  const canPlaceOrder = selectedAddressId && (!cart.items || cart.items.length > 0)

  // Final submit
  const handlePlaceOrder = async () => {
    setError('')
    if (!selectedAddressId) {
      setError('Please select or provide a shipping address.')
      setStep(1)
      return
    }

    if (paymentMethod === 'bank_transfer' && !receiptUrl) {
      setError('Please upload your bank transfer deposit receipt or screenshot before placing the order.')
      setStep(3)
      return
    }

    setLoading(true)
    try {
      const payload = {
        addressId: selectedAddressId,
        deliveryMethod,
        promoCode: appliedPromo?.code || undefined,
        paymentMethod,
        bank: paymentMethod === 'bank_transfer' ? BANKS.find((b) => b.id === selectedBank)?.name : undefined,
        receiptUrl: paymentMethod === 'bank_transfer' ? receiptUrl : undefined,
      }

      const res = await api.post('/api/checkouts', payload)
      await refreshCart()

      // Mobile money: create the order, then redirect to the gateway checkout
      if (paymentMethod === 'mobile') {
        try {
          const init = await api.post('/api/payments/init', { orderId: res.order.id, provider: 'mobile' })
          window.location.href = init.checkoutUrl
          return
        } catch {
          // Order exists but payment couldn't start — send to order page where they can retry
          navigate(`/order/${res.order.id}?payment=init_failed`, { state: { order: res.order } })
          return
        }
      }

      navigate(`/order/${res.order.id}`, { state: { order: res.order } })
    } catch (err) {
      setError(err.message || 'Failed to place order. Please check item availability.')
    } finally {
      setLoading(false)
    }
  }

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="page container narrow">
        <div className="card text-center" style={{ padding: '48px 24px', marginTop: 24 }}>
          <h2>Your cart is currently empty</h2>
          <p className="muted">Add items to your cart before proceeding to checkout.</p>
          <div style={{ marginTop: 20 }}>
            <Link to="/shop" className="btn btn-primary">
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page container">
      <div className="page-head">
        <h1>Secure Checkout</h1>
        <p>Complete your order in 4 easy steps.</p>
      </div>

      {/* Progress Tracker */}
      <div className="checkout-stepper">
        <div
          className={`step-item ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}
          onClick={() => setStep(1)}
        >
          <span className="step-num">{step > 1 ? '✓' : '1'}</span>
          <span className="step-label">Delivery Address</span>
        </div>
        <div className="step-line"></div>
        <div
          className={`step-item ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}
          onClick={() => canGoToStep2 && setStep(2)}
        >
          <span className="step-num">{step > 2 ? '✓' : '2'}</span>
          <span className="step-label">Delivery & Promo</span>
        </div>
        <div className="step-line"></div>
        <div
          className={`step-item ${step === 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}
          onClick={() => canGoToStep2 && setStep(3)}
        >
          <span className="step-num">{step > 3 ? '✓' : '3'}</span>
          <span className="step-label">Payment Method</span>
        </div>
        <div className="step-line"></div>
        <div
          className={`step-item ${step === 4 ? 'active' : ''}`}
          onClick={() => canGoToStep2 && setStep(4)}
        >
          <span className="step-num">4</span>
          <span className="step-label">Review & Place</span>
        </div>
      </div>

      {error && <div className="form-error" style={{ marginBottom: 20 }}>{error}</div>}

      <div className="checkout-grid">
        {/* Main Step Form Area */}
        <div className="checkout-main">
          {/* STEP 1: Delivery Address */}
          {step === 1 && (
            <div className="card checkout-card">
              <div className="card-header">
                <h2>1. Select Delivery Address</h2>
                {addresses.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                  >
                    {showNewAddressForm ? 'Select Saved Address' : '+ Add New Address'}
                  </button>
                )}
              </div>

              {!showNewAddressForm && addresses.length > 0 ? (
                <div className="address-picker">
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`address-option ${selectedAddressId === addr.id ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="delivery_address"
                        value={addr.id}
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                      />
                      <div className="addr-details">
                        <div className="addr-title">
                          <strong>{addr.fullName}</strong>
                          <span className="badge">{addr.label || 'Home'}</span>
                          {addr.isDefault && <span className="badge badge-success">Default</span>}
                        </div>
                        <p className="addr-text">
                          {addr.address}, {addr.subCity ? `${addr.subCity}, ` : ''}{addr.city}, {addr.region}
                        </p>
                        <p className="addr-phone"><Icon.Phone size={14} /> {addr.phone}</p>
                        {addr.deliveryInstructions && (
                          <p className="addr-inst">Note: {addr.deliveryInstructions}</p>
                        )}
                      </div>
                    </label>
                  ))}
                  <div style={{ marginTop: 24, textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!selectedAddressId}
                      onClick={() => setStep(2)}
                    >
                      Continue to Delivery →
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveAddress} className="address-form">
                  <div className="form-grid-2">
                    <label className="field">
                      <span>Full Name *</span>
                      <input
                        required
                        value={newAddress.fullName}
                        onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                        placeholder="e.g. Abebe Bikila"
                      />
                    </label>
                    <label className="field">
                      <span>Phone Number *</span>
                      <input
                        required
                        value={newAddress.phone}
                        onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                        placeholder="e.g. +251 911 223344"
                      />
                    </label>
                  </div>

                  <div className="form-grid-3">
                    <label className="field">
                      <span>Region / State *</span>
                      <select
                        value={newAddress.region}
                        onChange={(e) => setNewAddress({ ...newAddress, region: e.target.value })}
                      >
                        {REGIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>City *</span>
                      <input
                        required
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                        placeholder="e.g. Addis Ababa"
                      />
                    </label>
                    <label className="field">
                      <span>Sub-city / Zone</span>
                      <input
                        value={newAddress.subCity}
                        onChange={(e) => setNewAddress({ ...newAddress, subCity: e.target.value })}
                        placeholder="e.g. Bole"
                      />
                    </label>
                  </div>

                  <div className="form-grid-2">
                    <label className="field">
                      <span>Woreda / Kebele</span>
                      <input
                        value={newAddress.woreda}
                        onChange={(e) => setNewAddress({ ...newAddress, woreda: e.target.value })}
                        placeholder="e.g. 03"
                      />
                    </label>
                    <label className="field">
                      <span>Street / House Number *</span>
                      <input
                        required
                        value={newAddress.address}
                        onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                        placeholder="e.g. Near Edna Mall, House #123"
                      />
                    </label>
                  </div>

                  <label className="field">
                    <span>Delivery Instructions / Landmarks</span>
                    <textarea
                      rows={2}
                      value={newAddress.deliveryInstructions}
                      onChange={(e) => setNewAddress({ ...newAddress, deliveryInstructions: e.target.value })}
                      placeholder="e.g. Call upon reaching the gate or leave with reception"
                    />
                  </label>

                  <div className="btn-row" style={{ marginTop: 20 }}>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Saving Address...' : 'Save & Continue →'}
                    </button>
                    {addresses.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setShowNewAddressForm(false)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* STEP 2: Delivery Method & Promo Code */}
          {step === 2 && (
            <div className="card checkout-card">
              <h2>2. Delivery Option & Promo Code</h2>

              <div className="delivery-options" style={{ marginTop: 16 }}>
                <label className={`option-card ${deliveryMethod === 'standard' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="delivery_method"
                    value="standard"
                    checked={deliveryMethod === 'standard'}
                    onChange={() => setDeliveryMethod('standard')}
                  />
                  <div className="opt-body">
                    <div className="opt-title">
                      <strong>Standard Delivery</strong>
                      <span className="opt-price">{feeLabel(quotes.standard)}</span>
                    </div>
                    <p className="opt-desc">Delivered in {etaLabel(quotes.standardEta)} directly to your address.</p>
                  </div>
                </label>

                <label className={`option-card ${deliveryMethod === 'express' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="delivery_method"
                    value="express"
                    checked={deliveryMethod === 'express'}
                    disabled={!quotes.expressAvailable}
                    onChange={() => setDeliveryMethod('express')}
                  />
                  <div className="opt-body">
                    <div className="opt-title">
                      <strong>Express Delivery (Priority)</strong>
                      <span className="opt-price">{quotes.expressAvailable ? feeLabel(quotes.express) : 'N/A'}</span>
                    </div>
                    <p className="opt-desc">
                      {quotes.expressAvailable
                        ? 'Same-day or next-morning expedited dispatch.'
                        : 'Express delivery is not available for this area yet.'}
                    </p>
                  </div>
                </label>
              </div>

              <hr style={{ margin: '28px 0' }} />

              <h3>Have a Promo Code?</h3>
              {appliedPromo ? (
                <div className="applied-promo-box">
                  <div className="promo-badge">
                    <span>🏷️ <strong>{appliedPromo.code}</strong> applied ({appliedPromo.value}{appliedPromo.type === 'percent' ? '%' : ' ETB'} off)</span>
                    <button type="button" className="text-link danger" onClick={handleRemovePromo}>
                      Remove
                    </button>
                  </div>
                  <p className="promo-save-text">You save {appliedPromo.discount.toLocaleString()} ETB with this code!</p>
                </div>
              ) : (
                <form onSubmit={handleApplyPromo} className="promo-form">
                  <div className="promo-input-row">
                    <input
                      placeholder="Enter promo coupon code (e.g. WELCOME10)"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    />
                    <button type="submit" className="btn btn-dark" disabled={validatingPromo || !promoInput.trim()}>
                      {validatingPromo ? 'Checking...' : 'Apply Code'}
                    </button>
                  </div>
                  {promoError && <p className="form-error-text">{promoError}</p>}
                </form>
              )}

              <div className="step-actions" style={{ marginTop: 32 }}>
                <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>
                  ← Back to Address
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
                  Continue to Payment →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Payment Method */}
          {step === 3 && (
            <div className="card checkout-card">
              <h2>3. Payment Method</h2>
              <p className="muted">Choose your preferred payment method.</p>

              <div className="payment-options">
                <label className={`payment-card ${paymentMethod === 'cash_on_delivery' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="cash_on_delivery"
                    checked={paymentMethod === 'cash_on_delivery'}
                    onChange={() => setPaymentMethod('cash_on_delivery')}
                  />
                  <div className="payment-card-body">
                    <div className="payment-head">
                      <strong>💵 Cash on Delivery (COD)</strong>
                      <span className="badge">Popular</span>
                    </div>
                    <p className="muted" style={{ margin: 0 }}>
                      Pay safely in cash directly to our delivery courier upon receiving your package.
                    </p>
                  </div>
                </label>

                <label className={`payment-card ${paymentMethod === 'bank_transfer' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="bank_transfer"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={() => setPaymentMethod('bank_transfer')}
                  />
                  <div className="payment-card-body">
                    <div className="payment-head">
                      <strong>🏦 Bank Transfer</strong>
                      <span className="badge badge-info">CBE • Awash • Telebirr</span>
                    </div>
                    <p className="muted" style={{ margin: 0 }}>
                      Transfer directly to our official business bank account and upload your deposit slip or screenshot.
                    </p>
                  </div>
                </label>

                {mobilePay.enabled && (
                  <label className={`payment-card ${paymentMethod === 'mobile' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="payment_method"
                      value="mobile"
                      checked={paymentMethod === 'mobile'}
                      onChange={() => setPaymentMethod('mobile')}
                    />
                    <div className="payment-card-body">
                      <div className="payment-head">
                        <strong>📱 Mobile Money</strong>
                        <span className="badge badge-info">{mobilePay.providers.join(' • ')}</span>
                      </div>
                      <p className="muted" style={{ margin: 0 }}>
                        Pay securely with Telebirr, CBE Birr or M-Pesa. You'll be redirected to complete the payment.
                      </p>
                    </div>
                  </label>
                )}
              </div>

              {paymentMethod === 'bank_transfer' && (
                <div className="bank-transfer-container">
                  <h4>1. Select Official Account & Transfer Total: <strong>{totalAmount.toLocaleString()} ETB</strong></h4>
                  
                  <div className="bank-accounts-grid">
                    {BANKS.map((b) => (
                      <div
                        key={b.id}
                        className={`bank-box ${selectedBank === b.id ? 'active' : ''}`}
                        onClick={() => setSelectedBank(b.id)}
                      >
                        <div className="bank-name">{b.name}</div>
                        <div className="bank-acc">{b.account}</div>
                        <div className="bank-holder">Holder: {b.holder}</div>
                      </div>
                    ))}
                  </div>

                  <div className="receipt-upload-section" style={{ marginTop: 24 }}>
                    <h4>2. Upload Deposit Receipt or Screenshot *</h4>
                    <p className="muted" style={{ fontSize: 13.5 }}>
                      Our finance team verifies the transaction slip and immediately confirms your order for fulfillment.
                    </p>

                    {receiptUrl ? (
                      <div className="receipt-preview-card">
                        <img src={receiptUrl} alt="Payment Receipt" className="receipt-thumb" />
                        <div className="receipt-info">
                          <span className="badge badge-success">✓ Receipt Uploaded</span>
                          <p style={{ margin: '6px 0 0', fontSize: 13.5 }}>Ready for verification</p>
                          <button
                            type="button"
                            className="text-link danger"
                            style={{ fontSize: 13, marginTop: 4 }}
                            onClick={() => setReceiptUrl('')}
                          >
                            Replace receipt
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="upload-dropzone">
                        <input
                          type="file"
                          id="receipt-file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleReceiptUpload}
                          disabled={uploadingReceipt}
                        />
                        <label htmlFor="receipt-file" className="dropzone-label">
                          <span className="upload-icon">📄</span>
                          {uploadingReceipt ? (
                            <span>Uploading receipt image...</span>
                          ) : (
                            <span>
                              <strong>Click to upload deposit receipt</strong> or drag & drop (JPG, PNG, WebP)
                            </span>
                          )}
                        </label>
                      </div>
                    )}
                    {receiptError && <p className="form-error-text">{receiptError}</p>}
                  </div>
                </div>
              )}

              <div className="step-actions" style={{ marginTop: 32 }}>
                <button type="button" className="btn btn-outline" onClick={() => setStep(2)}>
                  ← Back to Delivery
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={paymentMethod === 'bank_transfer' && !receiptUrl}
                  onClick={() => setStep(4)}
                >
                  Review Order Summary →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Place Order */}
          {step === 4 && (
            <div className="card checkout-card">
              <h2>4. Final Review & Confirmation</h2>

              <div className="review-sections">
                {/* Address summary */}
                <div className="review-box">
                  <div className="review-box-head">
                    <strong>Shipping Address</strong>
                    <button type="button" className="text-link" onClick={() => setStep(1)}>Edit</button>
                  </div>
                  {selectedAddress ? (
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{selectedAddress.fullName} ({selectedAddress.phone})</p>
                      <p style={{ margin: '4px 0 0', color: 'var(--ink-2)' }}>
                        {selectedAddress.address}, {selectedAddress.city}, {selectedAddress.region}
                      </p>
                    </div>
                  ) : (
                    <p className="danger">No address selected</p>
                  )}
                </div>

                {/* Delivery & Payment summary */}
                <div className="review-grid-2">
                  <div className="review-box">
                    <div className="review-box-head">
                      <strong>Delivery Method</strong>
                      <button type="button" className="text-link" onClick={() => setStep(2)}>Edit</button>
                    </div>
                    <p style={{ margin: 0, textTransform: 'capitalize' }}>
                      {deliveryMethod === 'express' ? 'Express Delivery' : 'Standard Delivery'}
                      {` (${feeLabel(deliveryFee)})`}
                    </p>
                  </div>

                  <div className="review-box">
                    <div className="review-box-head">
                      <strong>Payment Method</strong>
                      <button type="button" className="text-link" onClick={() => setStep(3)}>Edit</button>
                    </div>
                    <p style={{ margin: 0 }}>
                      {paymentMethod === 'cash_on_delivery'
                        ? 'Cash on Delivery (COD)'
                        : `Bank Transfer (${BANKS.find((b) => b.id === selectedBank)?.name || 'Direct Bank'})`}
                    </p>
                    {receiptUrl && (
                      <span className="badge badge-success" style={{ marginTop: 6 }}>✓ Receipt Attached</span>
                    )}
                  </div>
                </div>

                {/* Items snapshot */}
                <div className="review-items-table">
                  <h4>Order Items ({cart.items?.length || 0})</h4>
                  {cart.items?.map((it, idx) => (
                    <div key={idx} className="review-item-row">
                      <img src={it.product.images?.[0] || '/placeholder.png'} alt={it.product.name} className="review-item-img" />
                      <div className="review-item-info">
                        <strong>{it.product.name}</strong>
                        {it.variantName && <span className="variant-label">{it.variantName}</span>}
                        <span className="item-qty-price">{it.qty} × {it.price.toLocaleString()} ETB</span>
                      </div>
                      <div className="review-item-subtotal">
                        {(it.qty * it.price).toLocaleString()} ETB
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="step-actions" style={{ marginTop: 32 }}>
                <button type="button" className="btn btn-outline" onClick={() => setStep(3)}>
                  ← Back to Payment
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  disabled={loading || !canPlaceOrder}
                  onClick={handlePlaceOrder}
                >
                  {loading ? 'Processing Order...' : `Confirm & Place Order (${totalAmount.toLocaleString()} ETB)`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sticky Sidebar */}
        <div className="checkout-sidebar">
          <div className="card summary-card">
            <h3>Order Summary</h3>
            <div className="summary-lines">
              <div className="summary-row">
                <span>Items Subtotal</span>
                <span>{subtotal.toLocaleString()} ETB</span>
              </div>
              <div className="summary-row">
                <span>Delivery Fee ({deliveryMethod === 'express' ? 'Express' : 'Standard'})</span>
                <span>{feeLabel(deliveryFee)}</span>
              </div>
              {appliedPromo && (
                <div className="summary-row discount">
                  <span>Discount ({appliedPromo.code})</span>
                  <span>-{discountAmount.toLocaleString()} ETB</span>
                </div>
              )}
              <hr />
              <div className="summary-row total">
                <strong>Total Amount</strong>
                <strong className="total-price">{totalAmount.toLocaleString()} ETB</strong>
              </div>
            </div>

            <div className="trust-badges-box">
              <div className="trust-item"><Icon.Shield size={16} /> SSL Encrypted & Secure Checkout</div>
              <div className="trust-item"><Icon.Truck size={16} /> Verified Ethiopian Delivery</div>
              <div className="trust-item"><Icon.Refresh size={16} /> 7-Day Return Guarantee</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
