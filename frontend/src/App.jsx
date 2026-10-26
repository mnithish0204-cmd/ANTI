import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ReportItemPage from './pages/ReportItemPage';
import MatchesPage from './pages/MatchesPage';
import NotificationsPage from './pages/NotificationsPage';
import MyReportsPage from './pages/MyReportsPage';
import AdminDashboard from './pages/AdminDashboard';
import EvaluationPage from './pages/EvaluationPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function AppContent() {
  const [activePage, setActivePage] = useState('home');

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <LandingPage setActivePage={setActivePage} />;
      case 'dashboard':
        return <DashboardPage setActivePage={setActivePage} />;
      case 'report-lost':
        return <ReportItemPage initialType="lost" setActivePage={setActivePage} />;
      case 'report-found':
        return <ReportItemPage initialType="found" setActivePage={setActivePage} />;
      case 'matches':
        return <MatchesPage setActivePage={setActivePage} />;
      case 'notifications':
        return <NotificationsPage setActivePage={setActivePage} />;
      case 'my-reports':
        return <MyReportsPage setActivePage={setActivePage} />;
      case 'admin':
        return <AdminDashboard setActivePage={setActivePage} />;
      case 'evaluation':
        return <EvaluationPage setActivePage={setActivePage} />;
      case 'login':
        return <LoginPage setActivePage={setActivePage} />;
      case 'register':
        return <RegisterPage setActivePage={setActivePage} />;
      default:
        return <LandingPage setActivePage={setActivePage} />;
    }
  };

  return (
    <div className="app-container">
      <Navbar activePage={activePage} setActivePage={setActivePage} />

      <main className="main-content">
        {renderPage()}
      </main>

      <footer 
        style={{ 
          borderTop: '1px solid var(--border-color)', 
          padding: '2rem', 
          textAlign: 'center', 
          fontSize: '0.825rem', 
          color: 'var(--text-muted)',
          background: 'rgba(10, 14, 23, 0.95)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span>Smart Campus Multimodal Lost & Found Platform</span>
          <span>•</span>
          <span>Image Vision (HSV & Gradients)</span>
          <span>•</span>
          <span>Semantic NLP</span>
          <span>•</span>
          <span>Spatial Ontology & GPS Haversine</span>
          <span>•</span>
          <span>Temporal Closeness</span>
          <span>•</span>
          <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>
            Interactive FastAPI Docs
          </a>
        </div>
        <p>© 2026 Smart Campus Institute of Technology. Production-grade Academic Research Platform.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}
