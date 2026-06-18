import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import Layout, { StatusBadge } from '../../components/Layout'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function loadSubmissions() {
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setSubmissions(data || [])
    setLoading(false)
  }

  useEffect(() => { loadSubmissions() }, [user])

  function handleContinue(sub) {
    if (['draft', 'pending_revision', 'returned'].includes(sub.status)) {
      navigate(`/submission/${sub.id}/table1`)
    } else {
      navigate(`/submission/${sub.id}/review-result`)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const sid = deleteTarget.id

    await supabase.from('ai_review_records').delete().eq('submission_id', sid)
    await supabase.from('manager_review_records').delete().eq('submission_id', sid)
    await supabase.from('attachments').delete().eq('submission_id', sid)
    await supabase.from('table3_deficiency').delete().eq('submission_id', sid)
    await supabase.from('table2_self_assessment').delete().eq('submission_id', sid)
    await supabase.from('table1_risk_assessment').delete().eq('submission_id', sid)
    await supabase.from('submissions').delete().eq('id', sid)

    setDeleteTarget(null)
    setDeleting(false)
    loadSubmissions()
  }

  function handleCopy(sub) {
    // 直接跳到複製流程頁，傳入來源案件 id
    navigate(`/submission/${sub.id}/copy-edit`)
  }

  return (
    <Layout>
      <div className="page-header">
        <h2>我的內控自評案件</h2>
        <p>查看所有自評案件進度，或新增本次自評作業</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <Link to="/submission/new" className="btn btn-primary">
          ＋ 新增內控自評
        </Link>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>載入中...</div>
          ) : submissions.length === 0 ? (
            <div className="empty-state">
              <h3>尚無自評案件</h3>
              <p>點擊「新增內控自評」開始填寫</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>評估單位</th>
                  <th>稽核循環類別</th>
                  <th>受評作業</th>
                  <th>評估期間</th>
                  <th>評估日期</th>
                  <th>狀態</th>
                  <th>建立時間</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => (
                  <tr key={sub.id}>
                    <td>{sub.evaluation_unit}</td>
                    <td>{sub.audit_cycle || <span style={{ color: 'var(--color-text-muted)' }}>-</span>}</td>
                    <td>{sub.evaluated_task}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {sub.period_start && sub.period_end
                        ? `${sub.period_start} 至 ${sub.period_end}`
                        : <span style={{ color: 'var(--color-text-muted)' }}>待填寫</span>
                      }
                    </td>
                    <td>{sub.evaluation_date}</td>
                    <td><StatusBadge status={sub.status} /></td>
                    <td>{new Date(sub.created_at).toLocaleDateString('zh-TW')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {['draft', 'pending_revision', 'returned'].includes(sub.status) && (
                          <button className="btn btn-sm btn-primary" onClick={() => handleContinue(sub)}>
                            繼續填寫
                          </button>
                        )}
                        {['pending_manager', 'manager_reviewing', 'approved', 'archived'].includes(sub.status) && (
                          <button className="btn btn-sm btn-secondary" onClick={() => handleContinue(sub)}>
                            查看
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleCopy(sub)}
                          title="複製此案件為新年度案件">
                          📋 複製
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => setDeleteTarget(sub)}
                          title="刪除此案件">
                          🗑 刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 刪除確認對話框 */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', padding: '32px',
            maxWidth: '420px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ marginBottom: '12px', color: 'var(--color-danger)' }}>⚠ 確認刪除</h3>
            <p style={{ marginBottom: '8px', color: 'var(--color-text-secondary)' }}>
              確定要刪除以下案件嗎？此操作無法復原。
            </p>
            <div style={{
              background: '#fff8f0', padding: '12px', borderRadius: '6px',
              marginBottom: '24px', fontSize: '14px'
            }}>
              <strong>{deleteTarget.evaluation_unit}</strong>｜{deleteTarget.evaluated_task}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                取消
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
