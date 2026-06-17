// ============================================================
// ManagerDashboardPage.jsx - 管理者案件總覽
// ============================================================
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Layout, { StatusBadge } from '../../components/Layout'

export function ManagerDashboardPage() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending_manager')

  useEffect(() => {
    async function load() {
      let query = supabase.from('v_submission_list').select('*').order('submitted_at', { ascending: false })
      if (filter !== 'all') query = query.eq('status', filter)
      const { data } = await query
      setSubmissions(data || [])
      setLoading(false)
    }
    load()
  }, [filter])

  const filters = [
    { value: 'pending_manager',   label: '待覆核' },
    { value: 'manager_reviewing', label: '覆核中' },
    { value: 'approved',          label: '已通過' },
    { value: 'returned',          label: '已退件' },
    { value: 'all',               label: '全部案件' },
  ]

  return (
    <Layout>
      <div className="page-header">
        <h2>管理者覆核總覽</h2>
        <p>查看所有待覆核及已處理的內控自評案件</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {filters.map(f => (
          <button key={f.value}
            className={`btn ${filter === f.value ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>載入中...</div>
          ) : submissions.length === 0 ? (
            <div className="empty-state"><h3>目前無符合條件的案件</h3></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>填表者</th>
                  <th>所屬單位</th>
                  <th>評估單位</th>
                  <th>受評作業</th>
                  <th>送出時間</th>
                  <th>AI覆核</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => (
                  <tr key={sub.id}>
                    <td>{sub.submitter_name}</td>
                    <td>{sub.submitter_dept}</td>
                    <td>{sub.evaluation_unit}</td>
                    <td>{sub.evaluated_task}</td>
                    <td>{sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('zh-TW') : '-'}</td>
                    <td>
                      {sub.latest_ai_passed === true && <span style={{ color: 'var(--color-success)' }}>✓ 通過</span>}
                      {sub.latest_ai_passed === false && <span style={{ color: 'var(--color-danger)' }}>✗ 有缺失</span>}
                      {sub.latest_ai_passed === null && '-'}
                    </td>
                    <td><StatusBadge status={sub.status} /></td>
                    <td>
                      <Link to={`/manager/review/${sub.id}`} className="btn btn-sm btn-primary">
                        進入覆核
                      </Link>
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

export default ManagerDashboardPage
