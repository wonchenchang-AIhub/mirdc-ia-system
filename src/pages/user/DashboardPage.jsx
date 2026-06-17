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

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setSubmissions(data || [])
      setLoading(false)
    }
    load()
  }, [user])

  function handleContinue(sub) {
    if (sub.status === 'draft') navigate(`/submission/${sub.id}/table1`)
    else if (sub.status === 'pending_revision') navigate(`/submission/${sub.id}/review-result`)
    else navigate(`/submission/${sub.id}/table1`)
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
                    <td>{sub.evaluated_task}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {sub.period_start} 至 {sub.period_end}
                    </td>
                    <td>{sub.evaluation_date}</td>
                    <td><StatusBadge status={sub.status} /></td>
                    <td>{new Date(sub.created_at).toLocaleDateString('zh-TW')}</td>
                    <td>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  )
}
