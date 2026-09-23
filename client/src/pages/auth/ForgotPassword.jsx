import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AuthShell from '../../components/AuthShell'

export default function ForgotPassword() {
  const { forgotPassword, resetPassword } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const sendCode = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const msg = await forgotPassword(email)
      setNotice(msg)
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const reset = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    try {
      await resetPassword(email, code, password)
      navigate('/login?reset=1')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title={step === 1 ? 'Forgot password' : 'Reset password'}
      subtitle={
        step === 1
          ? "Enter your account email and we'll send you a reset code."
          : 'Enter the code and choose a new password.'
      }
    >
      {step === 1 ? (
        <form className="auth-form" onSubmit={sendCode}>
          {error && <p className="form-error">{error}</p>}
          {notice && <p className="form-success">{notice}</p>}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send verification code'}
          </button>
          <p className="auth-switch">
            Remembered it? <Link to="/login">Sign in</Link>
          </p>
        </form>
      ) : (
        <form className="auth-form" onSubmit={reset}>
          <p className="muted">
            Code sent to <strong>{email}</strong>.
          </p>
          {error && <p className="form-error">{error}</p>}

          <label className="field">
            <span>Verification code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              required
            />
          </label>

          <label className="field">
            <span>New password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </label>

          <label className="field">
            <span>Confirm password</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              required
            />
          </label>

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Resetting…' : 'Reset password'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
