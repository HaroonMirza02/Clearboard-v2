import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import App from './App.jsx'
import Home from './components/Home.jsx'
import Dashboard from './components/Dashboard.jsx'
import Layout from './components/Layout.jsx'
import DepartmentSelection from './components/DepartmentSelection.jsx'
import Login from './components/Login.jsx'
import Signup from './components/Signup.jsx'
import ResetPassword from './components/ResetPassword'; // Adjust path
import AboutPage from './components/AboutPage'; // ✅ Import the new About Page

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/department', element: <DepartmentSelection /> },
      { path: '/about', element: <AboutPage /> },
       { path: '/login', element: <Login /> },
      { path: '/signup', element: <Signup /> },
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/reset-password/:token', element: <ResetPassword /> }, // move this up
      { path: '*', element: <App /> }, // move this down

    ],
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
