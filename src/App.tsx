import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import Dashboard from './features/matches/Dashboard'
import MatchCenter from './features/matches/MatchCenter'
import LeaderboardPage from './features/leaderboard/LeaderboardPage'
import GoldenBetsPage from './features/golden-bets/GoldenBetsPage'
import PredictionsFeedPage from './features/predictions/PredictionsFeedPage'
import AdminPage from './features/admin/AdminPage'
import NavBar from './components/common/NavBar'
import Spinner from './components/common/Spinner'

function ProtectedLayout() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen pb-20">
      <Outlet />
      <NavBar profile={profile} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/matches/:matchId" element={<MatchCenter />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/predictions" element={<PredictionsFeedPage />} />
          <Route path="/golden-bets" element={<GoldenBetsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
