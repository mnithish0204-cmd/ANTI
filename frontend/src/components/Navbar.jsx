import React from 'react';
import { 
  Sparkles, 
  Search, 
  PlusCircle, 
  Bell, 
  Layers, 
  BarChart3, 
  User, 
  LogOut,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export default function Navbar({ activePage, setActivePage }) {
  const { user, logout, switchDemoUser } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <nav className="navbar">
      {/* Brand */}
      <div 
        className="nav-brand" 
        style={{ cursor: 'pointer' }}
        onClick={() => setActivePage('home')}
      >
        <div className="nav-logo-icon">
          <Sparkles size={20} />
        </div>
        <span>Smart<span style={{ color: 'var(--accent-cyan)' }}>Campus</span> AI</span>
      </div>

      {/* Navigation Links */}
      <div className="nav-links">
        <button 
          className={`nav-item ${activePage === 'home' ? 'active' : ''}`}
          onClick={() => setActivePage('home')}
        >
          Home
        </button>

        <button 
          className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActivePage('dashboard')}
        >
          Dashboard
        </button>

        <button 
          className={`nav-item ${activePage === 'matches' ? 'active' : ''}`}
          onClick={() => setActivePage('matches')}
        >
          <Sparkles size={16} style={{ color: 'var(--accent-cyan)' }} />
          AI Matches
        </button>

        <button 
          className={`nav-item ${activePage === 'report-lost' ? 'active' : ''}`}
          onClick={() => setActivePage('report-lost')}
        >
          <PlusCircle size={16} />
          Report Lost
        </button>

        <button 
          className={`nav-item ${activePage === 'report-found' ? 'active' : ''}`}
          onClick={() => setActivePage('report-found')}
        >
          <CheckCircle2 size={16} />
          Report Found
        </button>

        <button 
          className={`nav-item ${activePage === 'my-reports' ? 'active' : ''}`}
          onClick={() => setActivePage('my-reports')}
        >
          <FileText size={16} />
          My Items
        </button>

        {user?.role === 'admin' && (
          <>
            <button 
              className={`nav-item ${activePage === 'admin' ? 'active' : ''}`}
              onClick={() => setActivePage('admin')}
            >
              <BarChart3 size={16} />
              Admin Portal
            </button>
            <button 
              className={`nav-item ${activePage === 'evaluation' ? 'active' : ''}`}
              onClick={() => setActivePage('evaluation')}
            >
              <Layers size={16} />
              Evaluation Benchmark
            </button>
          </>
        )}
      </div>

      {/* Right Controls: Demo Switcher, Notification Bell, Profile */}
      <div className="nav-right">
        {/* Quick Demo Switcher */}
        <div className="demo-switcher" title="Instant role switcher for evaluation">
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '0 0.35rem' }}>Demo:</span>
          <button 
            className={`demo-btn ${user?.email === 'aarav@campus.edu' ? 'active' : ''}`}
            onClick={() => switchDemoUser('aarav')}
            title="Lost Item Owner (Student)"
          >
            Aarav (Owner)
          </button>
          <button 
            className={`demo-btn ${user?.email === 'rahul@campus.edu' ? 'active' : ''}`}
            onClick={() => switchDemoUser('rahul')}
            title="Finder of Items"
          >
            Rahul (Finder)
          </button>
          <button 
            className={`demo-btn ${user?.email === 'admin@campus.edu' ? 'active' : ''}`}
            onClick={() => switchDemoUser('admin')}
            title="Campus Administrator"
          >
            Dr. Priya (Admin)
          </button>
        </div>

        {/* Notifications Icon */}
        <button 
          className="notif-bell-btn"
          onClick={() => setActivePage('notifications')}
          title="Notification Center"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="notif-badge-count">{unreadCount}</span>
          )}
        </button>

        {/* User Info & Logout */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem', 
                background: 'rgba(255,255,255,0.06)', 
                padding: '0.4rem 0.75rem', 
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '0.825rem'
              }}
            >
              <User size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>{user.name.split(' ')[0]}</span>
              <span 
                className={`badge ${user.role === 'admin' ? 'badge-high' : 'badge-found'}`} 
                style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}
              >
                {user.role}
              </span>
            </div>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={logout}
              title="Logout"
              style={{ padding: '0.4rem' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => setActivePage('login')}>
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
