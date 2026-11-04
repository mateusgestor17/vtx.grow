import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { Loading } from './components/ui';
import { Forgot, Login, ResetPassword, Signup } from './pages/Auth';
import Questionnaire from './pages/Questionnaire';
import { ClientHome, ClientReport, History } from './pages/Client';
import { AdminAudit, AdminLead, AdminLeads } from './pages/Admin';
import './styles.css';

function Private({ children, staff }: { children: JSX.Element; staff?: boolean }) {
  const { session, loading, profile, isStaff } = useAuth();
  if (loading || (session && !profile)) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  if (staff && !isStaff) return <Navigate to="/app" replace />;
  return children;
}
function Public({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;
  return session ? <Navigate to="/app" replace /> : children;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Public><Login /></Public>} />
          <Route path="/cadastro" element={<Public><Signup /></Public>} />
          <Route path="/recuperar" element={<Public><Forgot /></Public>} />
          <Route path="/redefinir-senha" element={<ResetPassword />} />
          <Route path="/app" element={<Private><ClientHome /></Private>} />
          <Route path="/app/questionario" element={<Private><Questionnaire /></Private>} />
          <Route path="/app/historico" element={<Private><History /></Private>} />
          <Route path="/app/d/:id/:section?" element={<Private><ClientReport /></Private>} />
          <Route path="/admin" element={<Private staff><AdminLeads /></Private>} />
          <Route path="/admin/auditoria" element={<Private staff><AdminAudit /></Private>} />
          <Route path="/admin/lead/:id/:tab?" element={<Private staff><AdminLead /></Private>} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
