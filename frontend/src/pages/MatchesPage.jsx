import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Filter, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { api } from '../services/api';
import MatchCard from '../components/MatchCard';
import MatchDetailModal from '../components/MatchDetailModal';

export default function MatchesPage({ setActivePage }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [statusFeedback, setStatusFeedback] = useState('');

  const loadMatches = async () => {
    setLoading(true);
    try {
      const data = await api.getMatches();
      setMatches(data);
    } catch (err) {
      console.error('Failed to load matches', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  const handleConfirm = async (matchId) => {
    try {
      const updated = await api.confirmMatch(matchId);
      setMatches(prev => prev.map(m => (m.id === matchId ? updated : m)));
      if (selectedMatch?.id === matchId) setSelectedMatch(updated);
      setStatusFeedback(`Match #${matchId} successfully CONFIRMED! Verified finder coordinates are unlocked.`);
    } catch (err) {
      alert(err.message || 'Confirmation failed');
    }
  };

  const handleReject = async (matchId) => {
    try {
      const updated = await api.rejectMatch(matchId);
      setMatches(prev => prev.map(m => (m.id === matchId ? updated : m)));
      if (selectedMatch?.id === matchId) setSelectedMatch(updated);
      setStatusFeedback(`Match #${matchId} marked as REJECTED.`);
    } catch (err) {
      alert(err.message || 'Rejection failed');
    }
  };

  const filteredMatches = matches.filter(m => {
    // Classification / Status Filter
    if (filterClass === 'HIGH' && m.classification !== 'HIGH_POTENTIAL') return false;
    if (filterClass === 'POSSIBLE' && m.classification !== 'POSSIBLE') return false;
    if (filterClass === 'CONFIRMED' && m.status !== 'CONFIRMED') return false;
    if (filterClass === 'REJECTED' && m.status !== 'REJECTED') return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const lostName = (m.lost_report?.item_name || '').toLowerCase();
      const foundName = (m.found_report?.item_name || '').toLowerCase();
      const lostLoc = (m.lost_report?.location || '').toLowerCase();
      const foundLoc = (m.found_report?.location || '').toLowerCase();
      return (
        lostName.includes(q) ||
        foundName.includes(q) ||
        lostLoc.includes(q) ||
        foundLoc.includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            <Sparkles size={16} />
            <span>MULTIMODAL INTELLIGENCE</span>
          </div>
          <h1 style={{ fontSize: '2.25rem' }}>AI Match Candidate Stream</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            Candidate matches scored by computer vision, semantic text embeddings, campus building proximity, & time interval.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={loadMatches} title="Refresh AI Matches">
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {statusFeedback && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#6ee7b7', padding: '0.75rem 1.25rem', borderRadius: 8, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>✓ {statusFeedback}</span>
          <button style={{ background: 'transparent', color: '#6ee7b7' }} onClick={() => setStatusFeedback('')}>✕</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            className={`demo-btn ${filterClass === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterClass('ALL')}
          >
            All Candidates ({matches.length})
          </button>
          <button 
            className={`demo-btn ${filterClass === 'HIGH' ? 'active' : ''}`}
            onClick={() => setFilterClass('HIGH')}
          >
            High Potential (≥80%)
          </button>
          <button 
            className={`demo-btn ${filterClass === 'POSSIBLE' ? 'active' : ''}`}
            onClick={() => setFilterClass('POSSIBLE')}
          >
            Possible (60-79%)
          </button>
          <button 
            className={`demo-btn ${filterClass === 'CONFIRMED' ? 'active' : ''}`}
            onClick={() => setFilterClass('CONFIRMED')}
          >
            Confirmed Matches
          </button>
          <button 
            className={`demo-btn ${filterClass === 'REJECTED' ? 'active' : ''}`}
            onClick={() => setFilterClass('REJECTED')}
          >
            Rejected
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search items or locations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Matches Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="ai-pulse-orb" style={{ margin: '0 auto 1.5rem' }}>
            <Sparkles size={32} />
          </div>
          <p style={{ color: 'var(--text-muted)' }}>Retrieving AI candidate matches...</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <AlertCircle size={44} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Matches Found</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '450px', margin: '0 auto 1.5rem' }}>
            No candidate items currently match this filter criteria. As campus reports are created, AI automatically analyzes and pairs them.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => setActivePage('report-lost')}>
            Report a New Item
          </button>
        </div>
      ) : (
        <div className="matches-grid">
          {filteredMatches.map(match => (
            <MatchCard 
              key={match.id}
              match={match}
              onSelect={setSelectedMatch}
              onConfirm={handleConfirm}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      {/* Match Detail Modal */}
      {selectedMatch && (
        <MatchDetailModal 
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onConfirm={handleConfirm}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
