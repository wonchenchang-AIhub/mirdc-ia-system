// CX-SCAN-SUPPRESS: Client Server Empty Password - password state is intentionally empty on init (user input field)
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  // NOTE: Empty initial value is intentional for form input binding, not a hardcoded credential
  const [userPassword, setUserPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [locked, setLocked] = useState(false)
  const [lockUntil, setLockUntil] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // 連續失敗5次鎖定5分鐘
    if (locked && lockUntil && new Date() < lockUntil) {
      const remaining = Math.ceil((lockUntil - new Date()) / 1000 / 60)
      setError(`登入失敗次數過多，請 ${remaining} 分鐘後再試`)
      return
    }

    // 基本驗證
    if (!email || !userPassword) {
      setError('請輸入電子郵件和密碼')
      return
    }

    if (userPassword.length < 8) {
      setError('密碼長度至少需要 8 個字元')
      return
    }

    setLoading(true)
    const { error: authError } = await signIn(email, userPassword)

    if (authError) {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      if (newAttempts >= 5) {
        const until = new Date(Date.now() + 5 * 60 * 1000)
        setLocked(true)
        setLockUntil(until)
        setError('登入失敗次數過多，帳號已暫時鎖定 5 分鐘')
      } else {
        setError(`帳號或密碼錯誤，請重新輸入（剩餘 ${5 - newAttempts} 次）`)
      }
    } else {
      setAttempts(0)
      setLocked(false)
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>內控自評作業系統</h1>
        <p className="subtitle">金屬工業研究發展中心｜稽核室</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="form-group">
            <label>電子郵件<span className="required">*</span></label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="請輸入您的電子郵件"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label>密碼<span className="required">*</span></label>
            <input
              type="password"
              className="form-control"
              value={userPassword}
              onChange={e => setUserPassword(e.target.value)}
              placeholder="請輸入密碼"
              autoComplete="current-password"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading || locked}
          >
            {loading ? '登入中...' : locked ? '帳號已暫時鎖定' : '登入'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
          尚未有帳號？<Link to="/register" style={{ color: 'var(--color-primary-light)' }}>立即註冊</Link>
        </div>
      </div>
    </div>
  )
}
