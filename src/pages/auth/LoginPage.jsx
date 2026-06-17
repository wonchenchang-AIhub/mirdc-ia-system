import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError('帳號或密碼錯誤，請重新輸入')
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>內控自評作業系統</h1>
        <p className="subtitle">金屬工業研究發展中心｜稽核室</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>電子郵件<span className="required">*</span></label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="請輸入您的電子郵件"
              required
            />
          </div>

          <div className="form-group">
            <label>密碼<span className="required">*</span></label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="請輸入密碼"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
          尚未有帳號？<Link to="/register" style={{ color: 'var(--color-primary-light)' }}>立即註冊</Link>
        </div>
      </div>
    </div>
  )
}
