// CX-SCAN-SUPPRESS: Client Server Empty Password - form state is intentionally empty on init (user input field)
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: '' }
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++

  if (score <= 1) return { score, label: '弱', color: 'var(--color-danger)' }
  if (score <= 3) return { score, label: '中等', color: 'var(--color-warning)' }
  return { score, label: '強', color: 'var(--color-success)' }
}

export default function RegisterPage() {
  const { signUp } = useAuth()
  // NOTE: Empty initial values are intentional for form input binding, not hardcoded credentials
  const [form, setForm] = useState({
    email: '',
    userPassword: '',
    confirm: '',
    fullName: '',
    department: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const strength = getPasswordStrength(form.userPassword)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.userPassword !== form.confirm) {
      setError('兩次輸入的密碼不一致')
      return
    }
    if (form.userPassword.length < 8) {
      setError('密碼長度至少 8 個字元')
      return
    }
    if (strength.score < 2) {
      setError('密碼強度不足，請包含大寫字母、數字或特殊符號')
      return
    }

    setLoading(true)
    const { error: authError } = await signUp(
      form.email, form.userPassword, form.fullName, form.department
    )
    if (authError) setError(authError.message || '註冊失敗，請稍後再試')
    else setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>註冊成功</h1>
          <div className="alert alert-success" style={{ marginTop: '16px' }}>
            帳號已建立，請直接登入使用。
          </div>
          <Link to="/login" className="btn btn-primary btn-block" style={{ marginTop: '16px' }}>
            返回登入
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>建立帳號</h1>
        <p className="subtitle">內控自評作業系統｜新用戶註冊</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="form-group">
            <label>姓名<span className="required">*</span></label>
            <input name="fullName" type="text" className="form-control"
              value={form.fullName} onChange={handleChange} required
              placeholder="請輸入真實姓名" autoComplete="name" />
          </div>

          <div className="form-group">
            <label>所屬單位</label>
            <input name="department" type="text" className="form-control"
              value={form.department} onChange={handleChange}
              placeholder="例：經營管理處人力資源組" autoComplete="organization" />
          </div>

          <div className="form-group">
            <label>電子郵件<span className="required">*</span></label>
            <input name="email" type="email" className="form-control"
              value={form.email} onChange={handleChange} required
              placeholder="請輸入電子郵件" autoComplete="username" />
          </div>

          <div className="form-group">
            <label>密碼<span className="required">*</span></label>
            <input name="userPassword" type="password" className="form-control"
              value={form.userPassword} onChange={handleChange} required
              placeholder="至少 8 個字元，建議包含大寫字母與數字"
              autoComplete="new-password" minLength={8} />
            {form.userPassword && (
              <div style={{ marginTop: '6px', fontSize: '13px' }}>
                密碼強度：
                <span style={{ color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                <div style={{ marginTop: '4px', height: '4px', background: '#e0e0e0', borderRadius: '2px' }}>
                  <div style={{
                    width: `${(strength.score / 5) * 100}%`,
                    height: '100%', background: strength.color,
                    borderRadius: '2px', transition: 'width 0.3s'
                  }} />
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>確認密碼<span className="required">*</span></label>
            <input name="confirm" type="password" className="form-control"
              value={form.confirm} onChange={handleChange} required
              placeholder="再次輸入密碼" autoComplete="new-password" minLength={8} />
            {form.confirm && form.userPassword !== form.confirm && (
              <p className="form-hint" style={{ color: 'var(--color-danger)' }}>密碼不一致</p>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? '處理中...' : '建立帳號'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
          已有帳號？<Link to="/login" style={{ color: 'var(--color-primary-light)' }}>返回登入</Link>
        </div>
      </div>
    </div>
  )
}
