import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import './styles/Typography.css' // Modern typography system
import App from './App.jsx'
import Home from './components/Home.jsx'
import Dashboard from './components/Dashboard.jsx'
import AdminDashboard from './components/AdminDashboard.jsx'
import Layout from './components/Layout.jsx'
import AdminLayout from './components/AdminLayout.jsx'
import Login from './components/Login.jsx'
import Signup from './components/Signup.jsx'
import AdminLogin from './components/AdminLogin.jsx'
import ResetPassword from './components/ResetPassword'; // Adjust path
import AboutPage from './components/AboutPage'; // ✅ Import the new About Page
import FacetedFileList from './components/FacetedFileList'; // ✅ Import the new Faceted File List
import DownloadPage from './pages/DownloadPage'; // ✅ Import Download Page
import DownloadAllPage from './pages/DownloadAllPage'; // ✅ Import Download All Page
import AuthCallback from './pages/AuthCallback'; // ✅ Import Google OAuth Callback
import SelectDepartment from './pages/SelectDepartment'; // ✅ Import Department Selection

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/login', element: <Login /> },
      { path: '/signup', element: <Signup /> },
      { path: '/admin-login', element: <AdminLogin /> },
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/files/grid', element: <FacetedFileList /> }, // ✅ New Faceted File List View
      { path: '/reset-password/:token', element: <ResetPassword /> },
      { path: '/download/:token', element: <DownloadPage /> }, // ✅ Download single file from email
      { path: '/download-all/:token', element: <DownloadAllPage /> }, // ✅ Download multiple files from email
      { path: '/auth/callback', element: <AuthCallback /> }, // ✅ Google OAuth Callback
      { path: '/select-department', element: <SelectDepartment /> }, // ✅ Department Selection
      { path: '*', element: <App /> },
    ],
  },
  {
    element: <AdminLayout />,
    children: [
      { path: '/admin-dashboard', element: <AdminDashboard /> },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
