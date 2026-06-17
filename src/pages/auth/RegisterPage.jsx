import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const [form, setForm] = useState({ email: '', password: '', confirm: '', fullName: '', department: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('兩次輸入的密碼不一致')
      return
    }
    if (form.password.length < 8) {
      setError('密碼長度至少 8 個字元')
      return
    }
    setLoading(true)
    const { error } = await signUp(form.email, form.password, form.fullName, form.department)
    if (error) setError(error.message || '註冊失敗，請稍後再試')
    else setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>註冊成功</h1>
          <div className="alert alert-success" style={{ marginTop: '16px' }}>
            驗證信已寄送至您的信箱，請點擊信中連結完成驗證後再登入。
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

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>姓名<span className="required">*</span></label>
            <input name="fullName" type="text" className="form-control"
              value={form.fullName} onChange={handleChange} required placeholder="請輸入真實姓名" />
          </div>

          <div className="form-group">
            <label>所屬單位</label>
            <input name="department" type="text" className="form-control"
              value={form.department} onChange={handleChange} placeholder="例：經營管理處人力資源組" />
          </div>

          <div className="form-group">
            <label>電子郵件<span className="required">*</span></label>
            <input name="email" type="email" className="form-control"
              value={form.email} onChange={handleChange} required placeholder="請輸入電子郵件" />
          </div>

          <div className="form-group">
            <label>密碼<span className="required">*</span></label>
            <input name="password" type="password" className="form-control"
              value={form.password} onChange={handleChange} required placeholder="至少 8 個字元" />
          </div>

          <div className="form-group">
            <label>確認密碼<span className="required">*</span></label>
            <input name="confirm" type="password" className="form-control"
              value={form.confirm} onChange={handleChange} required placeholder="再次輸入密碼" />
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
