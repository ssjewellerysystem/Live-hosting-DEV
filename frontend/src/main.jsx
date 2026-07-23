import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { MaintenanceProvider } from './context/MaintenanceContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MaintenanceProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </MaintenanceProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
