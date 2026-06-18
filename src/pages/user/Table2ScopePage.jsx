import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'

export default function Table2ScopePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState(null)
  const [totalCount, setTotalCount] = useState(0)
  const [topThirdCount, setTopThirdCount] = useState(0)
  const [scope, setScope] = useState('top_third')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: sub } = await supabase.from('submissions').select('*').eq('id', id).single()
      setSubmission(sub)
      if (sub?.table2_scope) setScope(sub.table2_scope)

      const { data: t1 } = await supabase.from('table1_risk_assessment')
        .select('id, included_in_table2').eq('submission_id', id)
      setTotalCount(t1?.length || 0)
      setTopThirdCount(t1?.filter(r => r.included_in_table2).length || 0)
    }
    load()
  }, [id])

  async function handleConfirm() {
    setSaving(true)
    await supabase.from('submissions').update({ table2_scope: scope }).eq('id', id)
    navigate(`/submission/${id}/table2`)
  }

  if (!submission) return <Layout><div className="loading-screen">載入中...</div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <h2>選擇附表二填寫範圍</h2>
        <p>{submission.evaluation_unit}｜{submission.evaluated_task}{submission.audit_cycle && <span style={{ marginLeft: '8px', padding: '2px 8px', background: '#e8f0fe', borderRadius: '12px', fontSize: '12px', color: 'var(--color-primary-light)' }}>{submission.audit_cycle}</span>}</p>
      </div>

      <div className="step-indicator">
        <div className="step-item done"><span className="step-number">✓</span>基本資訊</div>
        <div className="step-divider" />
        <div className="step-item done"><span className="step-number">✓</span>附表一：風險評估</div>
        <div className="step-divider" />
        <div className="step-item active"><span className="step-number">3</span>附表二：內控自評</div>
        <div className="step-divider" />
        <div className="step-item"><span className="step-number">4</span>送出覆核</div>
      </div>

      <div className="card" style={{ maxWidth: '680px' }}>
        <div className="card-header">請選擇本次內控自評範圍</div>
        <div className="card-body">
          <div className="alert alert-info" style={{ marginBottom: '24px' }}>
            附表一共有 <strong>{totalCount}</strong> 項控制重點，
            其中前 1/3 高風險項目為 <strong>{topThirdCount}</strong> 項。
          </div>

          <div className="scope-options">
            <div
              className={`scope-option ${scope === 'top_third' ? 'selected' : ''}`}
              onClick={() => setScope('top_third')}
            >
              <h3>依前 1/3 填寫（建議）</h3>
              <p>選取風險評估綜合評分最高的前 1/3 控制重點進行自評，符合作業說明基本要求。</p>
              <span className="count-badge">{topThirdCount} 項控制重點</span>
            </div>

            <div
              className={`scope-option ${scope === 'all' ? 'selected' : ''}`}
              onClick={() => setScope('all')}
            >
              <h3>全部控制重點填寫（全評）</h3>
              <p>適用所有控制點可在同一表單或卷宗內完成查核的情形。</p>
              <span className="count-badge">{totalCount} 項控制重點</span>
            </div>
          </div>

          <div className="action-bar">
            <button className="btn btn-secondary btn-lg"
              onClick={() => navigate(`/submission/${id}/table1`)}>
              ← 返回附表一
            </button>
            <button className="btn btn-primary btn-lg" onClick={handleConfirm} disabled={saving}>
              {saving ? '處理中...' : '確認並進入附表二 →'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
