import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AuthShell from '../../components/AuthShell'

export default function Verify() {
  const { verify, resendCode } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const location = useLocation()
  const email = params.get('email') || ''
  const redirect = params.get('redirect') || '/'

  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(location.state?.notice || '')
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await verify(email, code)
      navigate(redirect, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setSending(true)
    setError('')
    try {
      const msg = await resendCode(email)
      setNotice(msg || 'A new code has been sent.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthShell title="Verify your email" subtitle="Enter the 6-digit code to activate your account.">
      <form onSubmit={submit} className="auth-form">
        <p className="muted">
          We sent a code to <strong>{email || 'your email'}</strong>.
        </p>

        {error && <p className="form-error">{error}</p>}
        {notice && <p className="form-success">{notice}</p>}

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

        <button className="btn btn-primary btn-block" type="submit" disabled={busy || !email}>
          {busy ? 'Verifying…' : 'Verify & continue'}
        </button>

        <p className="auth-switch">
          Didn&apos;t receive it?{' '}
          <button type="button" className="text-link" onClick={resend} disabled={sending}>
            {sending ? 'Sending…' : 'Resend code'}
          </button>
        </p>
        <p className="auth-switch">
          <Link to="/register" className="text-link">
            Use a different email
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
