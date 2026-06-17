import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import Layout from '../../components/Layout'

export default function NewSubmissionPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    evaluation_unit: profile?.department || '',
    evaluated_task: '',
    period_start: '',
    period_end: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 自動帶入今日日期
  const today = new Date().toISOString().split('T')[0]

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (new Date(form.period_start) >= new Date(form.period_end)) {
      setError('評估期間起日必須早於迄日')
      return
    }

    setLoading(true)
    const { data, error: dbError } = await supabase
      .from('submissions')
      .insert({
        user_id: user.id,
        evaluation_unit: form.evaluation_unit,
        evaluated_task: form.evaluated_task,
        period_start: form.period_start,
        period_end: form.period_end,
        evaluation_date: today,
        status: 'draft',
      })
      .select()
      .single()

    if (dbError) {
      setError('建立案件失敗，請稍後再試')
      setLoading(false)
      return
    }

    navigate(`/submission/${data.id}/table1`)
  }

  return (
    <Layout>
      <div className="page-header">
        <h2>新增內控自評</h2>
        <p>請填寫本次自評的基本資訊</p>
      </div>

      <div className="step-indicator">
        <div className="step-item active">
          <span className="step-number">1</span>基本資訊
        </div>
        <div className="step-divider" />
        <div className="step-item"><span className="step-number">2</span>附表一：風險評估</div>
        <div className="step-divider" />
        <div className="step-item"><span className="step-number">3</span>附表二：內控自評</div>
        <div className="step-divider" />
        <div className="step-item"><span className="step-number">4</span>送出覆核</div>
      </div>

      <div className="card" style={{ maxWidth: '640px' }}>
        <div className="card-header">填寫基本資訊</div>
        <div className="card-body">
          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>評估單位<span className="required">*</span></label>
              <input name="evaluation_unit" type="text" className="form-control"
                value={form.evaluation_unit} onChange={handleChange} required
                placeholder="例：經營管理處人力資源組" />
              <p className="form-hint">請填寫完整的處別及組別名稱</p>
            </div>

            <div className="form-group">
              <label>受評作業（規章名稱／編號）<span className="required">*</span></label>
              <input name="evaluated_task" type="text" className="form-control"
                value={form.evaluated_task} onChange={handleChange} required
                placeholder="例：人員招募作業管理辦法（HR-001）" />
            </div>

            <div className="divider" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>評估期間（起）<span className="required">*</span></label>
                <input name="period_start" type="date" className="form-control"
                  value={form.period_start} onChange={handleChange} required />
                <p className="form-hint">上次自評日期後次月起</p>
              </div>
              <div className="form-group">
                <label>評估期間（迄）<span className="required">*</span></label>
                <input name="period_end" type="date" className="form-control"
                  value={form.period_end} onChange={handleChange} required />
                <p className="form-hint">評估日期當月底前</p>
              </div>
            </div>

            <div className="form-group">
              <label>評估日期</label>
              <div style={{
                padding: '9px 12px',
                background: '#f0f4fa',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '14px',
                color: 'var(--color-text-primary)'
              }}>
                {today}（系統自動帶入今日日期）
              </div>
            </div>

            <div className="action-bar">
              <button type="button" className="btn btn-secondary btn-lg"
                onClick={() => navigate('/dashboard')}>
                ← 返回案件列表
              </button>
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? '建立中...' : '下一步：填寫附表一 →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
