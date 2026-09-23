import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api'

export default function Profile() {
  const { user } = useAuth()

  // Profile info state
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState('')
  const [pwdError, setPwdError] = useState('')

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setProfileSuccess('')
    setProfileError('')
    if (!name.trim()) {
      setProfileError('Full name is required')
      return
    }

    setProfileSaving(true)
    try {
      await api.patch('/api/auth/profile', { name, phone })
      setProfileSuccess('Profile details updated successfully.')
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwdSuccess('')
    setPwdError('')

    if (!currentPassword || !newPassword) {
      setPwdError('Please enter your current and new password')
      return
    }

    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match')
      return
    }

    setPwdSaving(true)
    try {
      await api.patch('/api/auth/change-password', { currentPassword, newPassword })
      setPwdSuccess('Your password has been changed successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPwdError(err.message || 'Failed to change password')
    } finally {
      setPwdSaving(false)
    }
  }

  return (
    <div className="account-profile-page">
      <div className="section-head">
        <h2>Profile & Security Settings</h2>
        <p className="muted">Manage your personal information and password.</p>
      </div>

      <div className="profile-cards-grid" style={{ marginTop: 20 }}>
        {/* Profile Info Form */}
        <div className="card">
          <h3>Personal Details</h3>
          <p className="muted" style={{ fontSize: 13.5 }}>Update your contact information for order communications.</p>

          <form onSubmit={handleUpdateProfile} style={{ marginTop: 16 }}>
            <label className="field">
              <span>Email Address</span>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="input-disabled"
                style={{ background: 'var(--bg-soft)', color: 'var(--ink-2)', cursor: 'not-allowed' }}
              />
              <span className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Email cannot be changed directly. Contact support if needed.
              </span>
            </label>

            <label className="field">
              <span>Full Name *</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Abebe Bikila"
              />
            </label>

            <label className="field">
              <span>Phone Number</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +251 911 223344"
              />
            </label>

            {profileError && <div className="form-error">{profileError}</div>}
            {profileSuccess && <div className="form-success">{profileSuccess}</div>}

            <div style={{ marginTop: 20 }}>
              <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                {profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="card">
          <h3>Change Account Password</h3>
          <p className="muted" style={{ fontSize: 13.5 }}>Ensure your account stays secure with a strong password.</p>

          <form onSubmit={handleChangePassword} style={{ marginTop: 16 }}>
            <label className="field">
              <span>Current Password *</span>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </label>

            <label className="field">
              <span>New Password (min. 6 chars) *</span>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </label>

            <label className="field">
              <span>Confirm New Password *</span>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </label>

            {pwdError && <div className="form-error">{pwdError}</div>}
            {pwdSuccess && <div className="form-success">{pwdSuccess}</div>}

            <div style={{ marginTop: 20 }}>
              <button type="submit" className="btn btn-dark" disabled={pwdSaving}>
                {pwdSaving ? 'Updating Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
