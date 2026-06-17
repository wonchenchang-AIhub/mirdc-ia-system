import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'

export default function CopyEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState(null)
  const [form, setForm] = useState({ period_start: '', period_end: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('submissions').select('*').eq('id', id).single()
      setSubmission(data)
    }
    load()
  }, [id])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.period_start || !form.period_end) {
      setError('請填寫評估期間')
      return
    }
    if (new Date(form.period_start) >= new Date(form.period_end)) {
      setError('評估期間起日必須早於迄日')
      return
    }

    setSaving(true)
    await supabase.from('submissions').update({
      period_start: form.period_start,
      period_end: form.period_end,
    }).eq('id', id)

    setSaving(false)
    navigate(`/submission/${id}/table1`)
  }

  if (!submission) return <Layout><div className="loading-screen">載入中...</div></Layout>

  const today = new Date().toISOString().split('T')[0]

  return (
    <Layout>
      <div className="page-header">
        <h2>複製案件｜填寫評估期間</h2>
        <p>已複製：{submission.evaluation_unit}｜{submission.evaluated_task}</p>
      </div>

      <div className="card" style={{ maxWidth: '640px' }}>
        <div className="card-header">請填寫本次評估期間</div>
        <div className="card-body">
          <div className="alert alert-info" style={{ marginBottom: '24px' }}>
            附表一的控制重點已從舊案件複製過來，您可以在下一步直接修改。
            本頁請填寫本次的評估期間（評估日期已自動帶入今日：{today}）。
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
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

            <div className="action-bar">
              <button type="button" className="btn btn-secondary btn-lg"
                onClick={() => navigate('/dashboard')}>
                ← 返回案件列表
              </button>
              <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                {saving ? '儲存中...' : '確認，進入附表一 →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
