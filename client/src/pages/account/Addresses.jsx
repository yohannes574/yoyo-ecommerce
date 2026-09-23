import { useState, useEffect } from 'react'
import api from '../../api'
import Spinner from '../../components/Spinner'
import { Icon } from '../../components/Icons'

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

const EMPTY_FORM = {
  label: 'Home',
  fullName: '',
  phone: '',
  region: 'Addis Ababa',
  city: 'Addis Ababa',
  subCity: '',
  woreda: '',
  address: '',
  deliveryInstructions: '',
  isDefault: false,
}

export default function Addresses() {
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal / Form state
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchAddresses = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/addresses')
      setAddresses(res.addresses || [])
    } catch (err) {
      setError(err.message || 'Failed to load addresses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAddresses()
  }, [])

  const handleOpenAdd = () => {
    setEditingId(null)
    setFormData(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  const handleOpenEdit = (addr) => {
    setEditingId(addr.id)
    setFormData({
      label: addr.label || 'Home',
      fullName: addr.fullName || '',
      phone: addr.phone || '',
      region: addr.region || 'Addis Ababa',
      city: addr.city || 'Addis Ababa',
      subCity: addr.subCity || '',
      woreda: addr.woreda || '',
      address: addr.address || '',
      deliveryInstructions: addr.deliveryInstructions || '',
      isDefault: !!addr.isDefault,
    })
    setFormError('')
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!formData.fullName || !formData.phone || !formData.city || !formData.address) {
      setFormError('Please fill in all required fields (Name, Phone, City, Street/House).')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await api.patch(`/api/addresses/${editingId}`, formData)
      } else {
        await api.post('/api/addresses', formData)
      }
      setShowModal(false)
      await fetchAddresses()
    } catch (err) {
      setFormError(err.message || 'Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  const handleSetDefault = async (id) => {
    try {
      await api.put(`/api/addresses/${id}/default`)
      await fetchAddresses()
    } catch (err) {
      alert(err.message || 'Failed to update default address')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this address?')) return
    try {
      await api.delete(`/api/addresses/${id}`)
      await fetchAddresses()
    } catch (err) {
      alert(err.message || 'Failed to delete address')
    }
  }

  return (
    <div className="account-addresses-page">
      <div className="section-head-with-action">
        <div>
          <h2>Saved Addresses</h2>
          <p className="muted">Manage your shipping and delivery destinations.</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
          + Add New Address
        </button>
      </div>

      {error && <div className="form-error" style={{ margin: '16px 0' }}>{error}</div>}

      {loading ? (
        <div className="card text-center" style={{ padding: '60px 20px', marginTop: 16 }}>
          <Spinner />
          <p className="muted" style={{ marginTop: 12 }}>Loading saved addresses...</p>
        </div>
      ) : addresses.length > 0 ? (
        <div className="addresses-grid" style={{ marginTop: 20 }}>
          {addresses.map((addr) => (
            <div key={addr.id} className={`card address-card ${addr.isDefault ? 'default-card' : ''}`}>
              <div className="addr-card-top">
                <div className="addr-card-tags">
                  <span className="badge">{addr.label || 'Home'}</span>
                  {addr.isDefault && <span className="badge badge-success">✓ Default Shipping</span>}
                </div>
                <div className="addr-card-menu">
                  <button
                    type="button"
                    className="text-link"
                    style={{ fontSize: 13.5 }}
                    onClick={() => handleOpenEdit(addr)}
                  >
                    Edit
                  </button>
                  <span className="muted">|</span>
                  <button
                    type="button"
                    className="text-link danger"
                    style={{ fontSize: 13.5 }}
                    onClick={() => handleDelete(addr.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="addr-card-content" style={{ marginTop: 12 }}>
                <strong style={{ fontSize: 16 }}>{addr.fullName}</strong>
                <p className="muted" style={{ margin: '2px 0 0', fontSize: 14 }}>
                  <Icon.Phone size={14} /> {addr.phone}
                </p>
                <p style={{ margin: '8px 0 0', fontSize: 14 }}>
                  {addr.address}<br />
                  {addr.subCity ? `${addr.subCity}, ` : ''}{addr.city}, {addr.region}
                </p>
                {addr.deliveryInstructions && (
                  <p className="instructions-snippet muted" style={{ marginTop: 8, fontSize: 13 }}>
                    Note: {addr.deliveryInstructions}
                  </p>
                )}
              </div>

              {!addr.isDefault && (
                <div className="addr-card-bottom" style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleSetDefault(addr.id)}
                  >
                    Set as Default
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center" style={{ padding: '48px 20px', marginTop: 20 }}>
          <Icon.MapPin size={40} />
          <h3 style={{ marginTop: 12 }}>No Saved Addresses</h3>
          <p className="muted">Save your delivery locations for faster checkout.</p>
          <div style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
              + Add Your First Address
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Address Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card card" style={{ maxWidth: 560 }}>
            <h3>{editingId ? 'Edit Delivery Address' : 'Add New Delivery Address'}</h3>
            <p className="muted" style={{ fontSize: 13.5 }}>
              Enter accurate Ethiopian address details for reliable courier delivery.
            </p>

            <form onSubmit={handleSave} style={{ marginTop: 16 }}>
              <div className="form-grid-2">
                <label className="field">
                  <span>Address Label</span>
                  <select
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  >
                    <option value="Home">Home</option>
                    <option value="Office">Office / Workplace</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label className="field">
                  <span>Contact Full Name *</span>
                  <input
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Recipient's name"
                  />
                </label>
              </div>

              <div className="form-grid-2">
                <label className="field">
                  <span>Phone Number *</span>
                  <input
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +251 911 223344"
                  />
                </label>
                <label className="field">
                  <span>Region / State *</span>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  >
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-grid-2">
                <label className="field">
                  <span>City *</span>
                  <input
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Addis Ababa"
                  />
                </label>
                <label className="field">
                  <span>Sub-city / Zone</span>
                  <input
                    value={formData.subCity}
                    onChange={(e) => setFormData({ ...formData, subCity: e.target.value })}
                    placeholder="e.g. Bole"
                  />
                </label>
              </div>

              <div className="form-grid-2">
                <label className="field">
                  <span>Woreda / Kebele</span>
                  <input
                    value={formData.woreda}
                    onChange={(e) => setFormData({ ...formData, woreda: e.target.value })}
                    placeholder="e.g. 03"
                  />
                </label>
                <label className="field">
                  <span>Street / House Number *</span>
                  <input
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. Near Edna Mall, House #123"
                  />
                </label>
              </div>

              <label className="field">
                <span>Delivery Notes / Landmarks (Optional)</span>
                <textarea
                  rows={2}
                  value={formData.deliveryInstructions}
                  onChange={(e) => setFormData({ ...formData, deliveryInstructions: e.target.value })}
                  placeholder="e.g. Specific building, gate color, or landmark"
                />
              </label>

              <label className="checkbox-line" style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                />
                <span>Set as default shipping address</span>
              </label>

              {formError && <p className="form-error-text" style={{ marginTop: 12 }}>{formError}</p>}

              <div className="btn-row" style={{ marginTop: 24, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={saving}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
