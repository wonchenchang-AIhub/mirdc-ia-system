import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const STATUS_MAP = {
  draft:            '草稿',
  ai_reviewing:     'AI覆核中',
  pending_revision: '待修正',
  pending_manager:  '待人工覆核',
  manager_reviewing:'覆核中',
  approved:         '確認通過',
  returned:         '退件',
  archived:         '已存檔',
}

const BADGE_MAP = {
  draft:            'badge-draft',
  ai_reviewing:     'badge-reviewing',
  pending_revision: 'badge-pending',
  pending_manager:  'badge-waiting',
  manager_reviewing:'badge-waiting',
  approved:         'badge-approved',
  returned:         'badge-returned',
  archived:         'badge-archived',
}

export function StatusBadge({ status }) {
  return (
    <span className={`badge ${BADGE_MAP[status] || 'badge-draft'}`}>
      {STATUS_MAP[status] || status}
    </span>
  )
}

export default function Layout({ children }) {
  const { profile, signOut } = useAuth()
  const isManager = profile?.role === 'manager' || profile?.role === 'admin'

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>內控自評<br />作業系統</h1>
          
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
            📋 我的案件
          </NavLink>
          <NavLink to="/submission/new" className={({ isActive }) => isActive ? 'active' : ''}>
            ✏️ 新增自評
          </NavLink>
          {isManager && (
            <NavLink to="/manager" className={({ isActive }) => isActive ? 'active' : ''}>
              🔍 管理者覆核
            </NavLink>
          )}
        </nav>

        <div className="sidebar-user">
          <strong>{profile?.full_name || '用戶'}</strong>
          <p>{profile?.department || ''}</p>
          <p style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>
            {profile?.role === 'manager' ? '稽核室管理者' :
             profile?.role === 'admin' ? '系統管理者' : '填表者'}
          </p>
          <button className="btn-signout" onClick={signOut}>登出</button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
