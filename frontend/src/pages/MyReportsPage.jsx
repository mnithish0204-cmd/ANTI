import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  MapPin, 
  Calendar, 
  Clock, 
  Sparkles, 
  PlusCircle, 
  Tag, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';
import { api } from '../services/api';
import { getRealisticItemImage } from '../services/imageResolver';

export default function MyReportsPage({ setActivePage }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ALL');

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await api.getMyReports();
      setReports(data);
    } catch (err) {
      console.error('Failed to load my reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filtered = reports.filter(r => {
    if (tab === 'LOST') return r.report_type === 'lost';
    if (tab === 'FOUND') return r.report_type === 'found';
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            <FileText size={16} />
            <span>PERSONAL REPOSITORY</span>
          </div>
          <h1 style={{ fontSize: '2.25rem' }}>My Reported Items</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            Manage your lost item inquiries and found item notices.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setActivePage('report-lost')}>
            <PlusCircle size={15} />
            Report Lost
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('report-found')}>
            <PlusCircle size={15} />
            Report Found
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', marginBottom: '2rem', width: 'fit-content' }}>
        <button className={`demo-btn ${tab === 'ALL' ? 'active' : ''}`} onClick={() => setTab('ALL')}>
          All Items ({reports.length})
        </button>
        <button className={`demo-btn ${tab === 'LOST' ? 'active' : ''}`} onClick={() => setTab('LOST')}>
          Lost Items ({reports.filter(r => r.report_type === 'lost').length})
        </button>
        <button className={`demo-btn ${tab === 'FOUND' ? 'active' : ''}`} onClick={() => setTab('FOUND')}>
          Found Items ({reports.filter(r => r.report_type === 'found').length})
        </button>
      </div>

      {/* Items Grid */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading items...</p>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>You have not submitted any reports in this category yet.</p>
          <button className="btn btn-primary btn-sm" onClick={() => setActivePage('report-lost')}>
            Report an Item Now
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filtered.map(item => (
            <div key={item.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span className={`badge ${item.report_type === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                  {item.report_type.toUpperCase()}
                </span>
                <span className={`badge ${item.status === 'resolved' ? 'badge-resolved' : 'badge-high'}`}>
                  {item.status.toUpperCase()}
                </span>
              </div>

              <div style={{ width: '100%', height: 160, borderRadius: 8, overflow: 'hidden', marginBottom: '0.75rem', background: '#000' }}>
                <img 
                  src={getRealisticItemImage(item)} 
                  alt={item.item_name || 'Reported item'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>{item.item_name}</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', marginBottom: '0.75rem', flex: 1, lineHeight: 1.4 }}>
                {item.description}
              </p>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <MapPin size={13} />
                  <span>{item.location}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Calendar size={13} />
                  <span>{item.date} at {item.time}</span>
                </div>
              </div>

              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setActivePage('matches')}
                style={{ width: '100%' }}
              >
                <Sparkles size={14} style={{ color: 'var(--accent-cyan)' }} />
                Browse AI Matches
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
