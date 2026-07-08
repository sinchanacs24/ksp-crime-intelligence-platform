import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FirSearch from './pages/FirSearch';
import CriminalSearch from './pages/CriminalSearch';
import VictimSearch from './pages/VictimSearch';
import NetworkAnalysis from './pages/NetworkAnalysis';
import Analytics from './pages/Analytics';
import Prediction from './pages/Prediction';
import FinancialCrime from './pages/FinancialCrime';
import AiAssistant from './pages/AiAssistant';
import Admin from './pages/Admin';
import AuditLogs from './pages/AuditLogs';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/fir-search" element={<FirSearch />} />
                <Route path="/criminal-search" element={<CriminalSearch />} />
                <Route path="/victim-search" element={<VictimSearch />} />
                <Route path="/network-analysis" element={<NetworkAnalysis />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/prediction" element={<Prediction />} />
                <Route path="/financial-crime" element={<FinancialCrime />} />
                <Route path="/ai-assistant" element={<AiAssistant />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
