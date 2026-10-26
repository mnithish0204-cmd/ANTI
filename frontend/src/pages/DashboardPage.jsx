import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  PlusCircle, 
  CheckCircle2, 
  Bell, 
  MapPin, 
  Clock, 
  ArrowRight, 
  Layers, 
  TrendingUp, 
  ShieldCheck 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { api } from '../services/api';
import MatchCard from '../components/MatchCard';
import MatchDetailModal from '../components/MatchDetailModal';

export default function DashboardPage({ setActivePage }) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [myReports, setMyReports] = useState([]);
  const [topMatches, setTopMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [reps, matches] = await Promise.all([
          api.getMyReports(),
          api.getMatches('HIGH_POTENTIAL')
        ]);
        setMyReports(reps);
        setTopMatches(matches.slice(0, 4));
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [user]);

  const lostCount = myReports.filter(r => r.report_type === 'lost').length;
  const foundCount = myReports.filter(r => r.report_type === 'found').length;
  const resolvedCount = myReports.filter(r => r.status === 'resolved').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Welcome Banner */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '2rem 2.5rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
          background: 'linear-gradient(135deg, rgba(26, 37, 60, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid var(--border-glow)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
            <Sparkles size={16} />
            <span>CAMPUS AI INTELLIGENCE ACTIVE</span>
          </div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            Welcome back, {user?.name || 'Campus Student'}!
          </h1>
          <p style={{ color: 'var(--text-sub)', fontSize: '0.95rem' }}>
            Campus ID: <strong style={{ color: 'var(--text-main)' }}>{user?.campus_id || 'STU-10822'}</strong> · Role: <strong style={{ color: 'var(--accent-cyan)' }}>{user?.role?.toUpperCase()}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setActivePage('report-lost')}>
            <PlusCircle size={16} />
            Report Lost Item
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('report-found')}>
            <CheckCircle2 size={16} style={{ color: 'var(--accent-cyan)' }} />
            Report Found Item
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <Layers size={24} />
          </div>
          <div>
            <div className="stat-value">{lostCount}</div>
            <div className="stat-label">My Lost Items</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="stat-value">{foundCount}</div>
            <div className="stat-label">My Found Items</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="stat-value">{resolvedCount}</div>
            <div className="stat-label">Resolved / Returned</div>
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setActivePage('notifications')}>
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <Bell size={24} />
          </div>
          <div>
            <div className="stat-value">{unreadCount}</div>
            <div className="stat-label">Unread AI Alerts</div>
          </div>
        </div>
      </div>

      {/* Top High Potential Matches Section */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>High-Confidence AI Matches</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Items with strong multimodal correlation requiring verification</p>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('matches')}>
            View All AI Matches ({topMatches.length})
            <ArrowRight size={14} />
          </button>
        </div>

        {topMatches.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <Sparkles size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
            <p style={{ color: 'var(--text-muted)' }}>No high-potential matches pending at this moment.</p>
          </div>
        ) : (
          <div className="matches-grid">
            {topMatches.map(m => (
              <MatchCard 
                key={m.id}
                match={m}
                onSelect={setSelectedMatch}
                onConfirm={async (id) => {
                  const updated = await api.confirmMatch(id);
                  setTopMatches(prev => prev.map(item => item.id === id ? updated : item));
                }}
                onReject={async (id) => {
                  const updated = await api.rejectMatch(id);
                  setTopMatches(prev => prev.map(item => item.id === id ? updated : item));
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal View */}
      {selectedMatch && (
        <MatchDetailModal 
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onConfirm={async (id) => {
            const updated = await api.confirmMatch(id);
            setSelectedMatch(updated);
          }}
          onReject={async (id) => {
            await api.rejectMatch(id);
            setSelectedMatch(null);
          }}
        />
      )}
    </div>
  );
}
