import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/user/DashboardPage'
import NewSubmissionPage from './pages/user/NewSubmissionPage'
import Table1Page from './pages/user/Table1Page'
import Table2ScopePage from './pages/user/Table2ScopePage'
import Table2Page from './pages/user/Table2Page'
import Table3Page from './pages/user/Table3Page'
import ReviewResultPage from './pages/user/ReviewResultPage'
import ManagerDashboardPage from './pages/manager/ManagerDashboardPage'
import ManagerReviewPage from './pages/manager/ManagerReviewPage'

function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="loading-screen">載入中...</div>
  if (!user) return <Navigate to="/login" replace />
  if (requiredRole && profile?.role !== requiredRole && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function AppRoutes() {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="loading-screen">載入中...</div>

  return (
    <Routes>
      {/* 公開頁面 */}
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/dashboard" />} />

      {/* 填表者頁面 */}
      <Route path="/dashboard" element={
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      } />
      <Route path="/submission/new" element={
        <ProtectedRoute><NewSubmissionPage /></ProtectedRoute>
      } />
      <Route path="/submission/:id/table1" element={
        <ProtectedRoute><Table1Page /></ProtectedRoute>
      } />
      <Route path="/submission/:id/table2-scope" element={
        <ProtectedRoute><Table2ScopePage /></ProtectedRoute>
      } />
      <Route path="/submission/:id/table2" element={
        <ProtectedRoute><Table2Page /></ProtectedRoute>
      } />
      <Route path="/submission/:id/table3" element={
        <ProtectedRoute><Table3Page /></ProtectedRoute>
      } />
      <Route path="/submission/:id/review-result" element={
        <ProtectedRoute><ReviewResultPage /></ProtectedRoute>
      } />

      {/* 管理者頁面 */}
      <Route path="/manager" element={
        <ProtectedRoute requiredRole="manager"><ManagerDashboardPage /></ProtectedRoute>
      } />
      <Route path="/manager/review/:id" element={
        <ProtectedRoute requiredRole="manager"><ManagerReviewPage /></ProtectedRoute>
      } />

      {/* 預設導向 */}
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/mirdc-ia-system">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
