import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import Layout, { StatusBadge } from '../../components/Layout'

export default function ManagerReviewPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState(null)
  const [t1, setT1] = useState([])
  const [t2, setT2] = useState([])
  const [t3, setT3] = useState([])
  const [attachments, setAttachments] = useState([])
  const [aiReviews, setAiReviews] = useState([])
  const [comments, setComments] = useState({ table1: '', table2: '', table3: '' })
  const [decision, setDecision] = useState('')
  const [returnReason, setReturnReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: sub }, { data: t1d }, { data: t2d }, { data: t3d }, { data: att }, { data: ai }] = await Promise.all([
        supabase.from('submissions').select('*').eq('id', id).single(),
        supabase.from('table1_risk_assessment').select('*').eq('submission_id', id).order('sort_order'),
        supabase.from('table2_self_assessment').select('*').eq('submission_id', id).order('sort_order'),
        supabase.from('table3_deficiency').select('*').eq('submission_id', id),
        supabase.from('attachments').select('*').eq('submission_id', id),
        supabase.from('ai_review_records').select('*').eq('submission_id', id).order('reviewed_at', { ascending: false }),
      ])
      setSubmission(sub)
      setT1(t1d || [])
      setT2(t2d || [])
      setT3(t3d || [])
      setAttachments(att || [])
      setAiReviews(ai || [])

      await supabase.from('submissions').update({ status: 'manager_reviewing' }).eq('id', id)
    }
    load()
  }, [id])

  async function handleDecision() {
    if (!decision) { alert('請選擇覆核決定（確認通過或退件修正）'); return }
    if (decision === 'returned' && !returnReason.trim()) { alert('請填寫退件原因'); return }

    setSaving(true)
    const newStatus = decision === 'approved' ? 'approved' : 'returned'

    await supabase.from('manager_review_records').insert({
      submission_id: id,
      reviewer_id: user.id,
      table1_comments: comments.table1 || null,
      table2_comments: comments.table2 || null,
      table3_comments: comments.table3 || null,
      decision,
      return_reason: decision === 'returned' ? returnReason : null,
      notified_at: new Date().toISOString(),
    })

    await supabase.from('submissions').update({
      status: newStatus,
      manager_reviewed_at: new Date().toISOString(),
      ...(newStatus === 'approved' ? { archived_at: new Date().toISOString() } : {}),
    }).eq('id', id)

    setSaving(false)
    setDone(true)
  }

  const RESULT_LABEL = { fulfilled: '落實', partial: '部分落實', not_fulfilled: '未落實', not_applicable: '不適用', other: '其他', pending: '未填寫' }

  if (!submission) return <Layout><div className="loading-screen">載入中...</div></Layout>

  if (done) {
    return (
      <Layout>
        <div style={{ maxWidth: '480px', margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>{decision === 'approved' ? '✅' : '↩️'}</div>
          <h2 style={{ marginBottom: '8px' }}>{decision === 'approved' ? '已確認通過' : '已退件通知填表者'}</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>覆核結果已記錄，Email 通知已發送給填表者。</p>
          <button className="btn btn-primary" onClick={() => navigate('/manager')}>返回總覽</button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>人工覆核</h2>
          <p>{submission.evaluation_unit}｜{submission.evaluated_task}</p>
        </div>
        <StatusBadge status={submission.status} />
      </div>

      {/* AI覆核摘要 */}
      {aiReviews.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">AI 初步覆核結果（第 {aiReviews[0].review_round} 輪）</div>
          <div className="card-body">
            <div className={`alert ${aiReviews[0].passed ? 'alert-success' : 'alert-info'}`}>
              {aiReviews[0].passed ? '✅ AI覆核通過' : `⚠ AI 發現 ${aiReviews[0].issues?.length || 0} 項問題（填表者已修正後重新送出）`}
            </div>
            {aiReviews[0].issues?.map((issue, i) => (
              <div key={i} className={`review-issue ${issue.severity}`} style={{ fontSize: '13px' }}>
                <div className="review-issue-title">{issue.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 附表一 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">附表一：內控自評之風險評估</div>
        <div className="card-body" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: '900px' }}>
              <thead>
                <tr>
                  <th>#</th><th>控制重點</th><th>外稽A</th><th>內稽A</th>
                  <th>管理B</th><th>組織C</th><th>環境D</th><th>財務E</th><th>隱藏F</th>
                  <th>綜合評分</th><th>前1/3</th><th>注意事項</th>
                </tr>
              </thead>
              <tbody>
                {t1.map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{r.control_point}</td>
                    <td>{r.score_a_external}</td><td>{r.score_a_internal}</td>
                    <td>{r.score_b}</td><td>{r.score_c}</td><td>{r.score_d}</td>
                    <td>{r.score_e}</td><td>{r.score_f}</td>
                    <td><strong>{r.comprehensive_score}</strong></td>
                    <td>{r.included_in_table2 ? '★' : '-'}</td>
                    <td style={{ fontSize: '13px' }}>{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '16px' }}>
            <div className="form-group">
              <label>附表一覆核意見</label>
              <textarea className="form-control" rows="3" placeholder="填寫覆核意見（選填）"
                value={comments.table1} onChange={e => setComments(c => ({ ...c, table1: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      {/* 附表二 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">附表二：內控自評表</div>
        <div className="card-body" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>控制重點</th><th>綜合評分</th><th>評估結果</th><th>改善措施</th><th>佐證資料</th></tr>
            </thead>
            <tbody>
              {t2.map((r, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{r.control_point}</td>
                  <td>{r.risk_score}</td>
                  <td>
                    <span style={{
                      color: r.result === 'fulfilled' ? 'var(--color-success)' :
                             r.result === 'not_applicable' ? 'var(--color-text-muted)' : 'var(--color-warning)',
                      fontWeight: 600
                    }}>
                      {RESULT_LABEL[r.result]}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px' }}>{r.improvement_measures || '-'}</td>
                  <td>
                    {attachments.filter(a => a.table2_id === r.id).map((a, ai) => (
                      <div key={ai} style={{ fontSize: '12px' }}>📎 {a.file_name}</div>
                    ))}
                    {attachments.filter(a => a.table2_id === r.id).length === 0 && (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '16px' }}>
            <div className="form-group">
              <label>附表二覆核意見</label>
              <textarea className="form-control" rows="3" placeholder="填寫覆核意見（選填）"
                value={comments.table2} onChange={e => setComments(c => ({ ...c, table2: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      {/* 附表三 */}
      {t3.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">附表三：缺失改善或興革建議辦理單</div>
          <div className="card-body">
            {t3.map((r, i) => (
              <div key={i} style={{ marginBottom: '16px', padding: '16px', background: '#fff8f0', borderRadius: '6px', fontSize: '14px' }}>
                <strong>第 {i + 1} 項 | {r.category === 'deficiency' ? '缺失改善' : '興革建議'}</strong>
                {r.description_a && <p style={{ marginTop: '8px' }}><strong>缺失說明：</strong>{r.description_a}</p>}
                {r.cause_b && <p><strong>原因分析：</strong>{r.cause_b}</p>}
                {r.improvement_c && <p><strong>改善措施：</strong>{r.improvement_c}（預訂：{r.target_date_c}）</p>}
                {r.suggestion_d && <p><strong>興革建議：</strong>{r.suggestion_d}（預訂：{r.target_date_d}）</p>}
              </div>
            ))}
            <div className="form-group">
              <label>附表三覆核意見</label>
              <textarea className="form-control" rows="3" placeholder="填寫覆核意見（選填）"
                value={comments.table3} onChange={e => setComments(c => ({ ...c, table3: e.target.value }))} />
            </div>
          </div>
        </div>
      )}

      {/* 覆核決定 */}
      <div className="card">
        <div className="card-header">覆核決定</div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 600 }}>
              <input type="radio" name="decision" value="approved" checked={decision === 'approved'}
                onChange={() => setDecision('approved')} />
              <span style={{ color: 'var(--color-success)' }}>✅ 確認通過</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 600 }}>
              <input type="radio" name="decision" value="returned" checked={decision === 'returned'}
                onChange={() => setDecision('returned')} />
              <span style={{ color: 'var(--color-danger)' }}>↩️ 退件修正</span>
            </label>
          </div>

          {decision === 'returned' && (
            <div className="form-group">
              <label>退件原因<span className="required">*</span></label>
              <textarea className="form-control" rows="4"
                value={returnReason} onChange={e => setReturnReason(e.target.value)}
                placeholder="請具體說明需要修正的內容，此內容將 Email 通知填表者" />
            </div>
          )}

          <div className="action-bar">
            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/manager')}>
              ← 返回總覽
            </button>
            <button
              className={`btn btn-lg ${decision === 'approved' ? 'btn-success' : 'btn-danger'}`}
              onClick={handleDecision} disabled={saving || !decision}>
              {saving ? '處理中...' : decision === 'approved' ? '確認通過並通知填表者' : '退件並通知填表者'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
