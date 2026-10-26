import React, { useState } from 'react';
import { 
  Bell, 
  Sparkles, 
  ShieldCheck, 
  X, 
  Check, 
  Clock, 
  ArrowRight, 
  AlertCircle,
  Inbox
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { api } from '../services/api';
import MatchDetailModal from '../components/MatchDetailModal';

export default function NotificationsPage({ setActivePage }) {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const filteredNotifs = filterUnreadOnly 
    ? notifications.filter(n => !n.is_read) 
    : notifications;

  const handleOpenMatch = async (matchId) => {
    if (!matchId) return;
    try {
      const matchData = await api.getMatchDetail(matchId);
      setSelectedMatch(matchData);
    } catch (err) {
      console.error('Failed to open match from notification', err);
      setActivePage('matches');
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'POTENTIAL_MATCH':
        return <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={20} /></div>;
      case 'MATCH_CONFIRMED':
        return <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={20} /></div>;
      case 'MATCH_REJECTED':
        return <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></div>;
      default:
        return <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bell size={20} /></div>;
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            <Bell size={16} />
            <span>CAMPUS ALERT CENTER</span>
          </div>
          <h1 style={{ fontSize: '2.25rem' }}>Notifications</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            Instant alerts when multimodal AI detects potential item pairings or confirmation updates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className={`btn btn-sm ${filterUnreadOnly ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterUnreadOnly(!filterUnreadOnly)}
          >
            {filterUnreadOnly ? 'Show All' : `Unread Only (${unreadCount})`}
          </button>

          {unreadCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
              <Check size={14} />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifs.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Inbox size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Notifications</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            You're all caught up! You will be alerted when new matches are generated.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredNotifs.map(n => (
            <div 
              key={n.id}
              className="glass-card"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1.25rem',
                borderLeft: n.is_read ? '1px solid var(--border-color)' : '4px solid var(--accent-cyan)',
                background: n.is_read ? 'var(--bg-card)' : 'rgba(26, 37, 60, 0.95)'
              }}
            >
              {getNotifIcon(n.type)}

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{n.title}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={12} />
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-sub)', marginBottom: '0.85rem', lineHeight: 1.5 }}>
                  {n.message}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {n.match_id && (
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleOpenMatch(n.match_id)}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
                    >
                      <Sparkles size={13} />
                      View Match Details
                      <ArrowRight size={13} />
                    </button>
                  )}

                  {!n.is_read && (
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => markAsRead(n.id)}
                      style={{ fontSize: '0.775rem', padding: '0.35rem 0.75rem' }}
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Match Detail Modal from notification click */}
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
