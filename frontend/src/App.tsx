import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/Layout/MainLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Jobs from './pages/Jobs'
import Resumes from './pages/Resumes'
import Applications from './pages/Applications'
import Match from './pages/Match'
import Campus from './pages/Campus'
import { useAuthStore } from './stores/authStore'

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())

  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
        <Route path="register" element={isAuthenticated ? <Navigate to="/" /> : <Register />} />
        <Route path="jobs" element={<Jobs />} />
        <Route
          path="resumes"
          element={isAuthenticated ? <Resumes /> : <Navigate to="/login" />}
        />
        <Route
          path="applications"
          element={isAuthenticated ? <Applications /> : <Navigate to="/login" />}
        />
        <Route
          path="match"
          element={isAuthenticated ? <Match /> : <Navigate to="/login" />}
        />
        <Route path="campus" element={<Campus />} />
      </Route>
    </Routes>
  )
}

export default App
