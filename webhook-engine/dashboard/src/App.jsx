import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Security from './pages/Security';
import Transactions from './pages/Transactions';
import ManualReview from './pages/ManualReview';
import AIInsights from './pages/AIInsights';
import HealMonitor from './pages/HealMonitor';

function ProtectedRoute({ children }) {
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/security" element={<ProtectedRoute><Security /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
        <Route path="/review" element={<ProtectedRoute><ManualReview /></ProtectedRoute>} />
        <Route path="/ai-insights" element={<ProtectedRoute><AIInsights /></ProtectedRoute>} />
        <Route path="/heal-monitor" element={<ProtectedRoute><HealMonitor /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
