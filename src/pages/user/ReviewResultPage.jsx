import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'

export default function ReviewResultPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('submissions').select('*').eq('id', id).single()
      setSubmission(data)
      if (data?.status === 'pending_manager' || data?.status === 'approved') {
        setSubmitted(true)
      }
    }
    load()
  }, [id])

  async function handleSubmit() {
    setSubmitting(true)
    await supabase.from('submissions').update({
      status: 'pending_manager',
      submitted_at: new Date().toISOString(),
      manager_notified_at: new Date().toISOString(),
    }).eq('id', id)
    setSubmitting(false)
    setSubmitted(true)
  }

  if (!submission) return <Layout><div className="loading-screen">載入中...</div></Layout>

  if (submitted) {
    return (
      <Layout>
        <div style={{ maxWidth: '560px', margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ color: 'var(--color-primary)', marginBottom: '8px' }}>送出成功</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
            已通知稽核室管理者進行人工覆核。覆核完成後將以 Email 通知您。
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            返回我的案件
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page-header">
        <h2>送出前確認</h2>
        <p>{submission.evaluation_unit}｜{submission.evaluated_task}</p>
      </div>

      <div className="step-indicator">
        <div className="step-item done"><span className="step-number">✓</span>基本資訊</div>
        <div className="step-divider" />
        <div className="step-item done"><span className="step-number">✓</span>附表一</div>
        <div className="step-divider" />
        <div className="step-item done"><span className="step-number">✓</span>附表二</div>
        <div className="step-divider" />
        <div className="step-item done"><span className="step-number">✓</span>附表三</div>
        <div className="step-divider" />
        <div className="step-item active"><span className="step-number">5</span>送出覆核</div>
      </div>

      <div className="card" style={{ maxWidth: '640px' }}>
        <div className="card-header">確認送出</div>
        <div className="card-body">
          <div className="alert alert-info" style={{ marginBottom: '24px' }}>
            請確認以下資訊無誤後送出，送出後將通知稽核室管理者進行人工覆核。
          </div>

          <table className="data-table" style={{ marginBottom: '24px' }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600, width: '120px' }}>評估單位</td>
                <td>{submission.evaluation_unit}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>受評作業</td>
                <td>{submission.evaluated_task}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>評估期間</td>
                <td>{submission.period_start} 至 {submission.period_end}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>評估日期</td>
                <td>{submission.evaluation_date}</td>
              </tr>
            </tbody>
          </table>

          <div className="action-bar">
            <button className="btn btn-secondary btn-lg"
              onClick={() => navigate(`/submission/${id}/table3`)}>
              ← 返回修改
            </button>
            <button className="btn btn-success btn-lg"
              onClick={handleSubmit} disabled={submitting}>
              {submitting ? '送出中...' : '確認送出，通知管理者覆核 →'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
