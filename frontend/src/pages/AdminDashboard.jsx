import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Sliders, 
  Trash2, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck, 
  MapPin, 
  Tag, 
  TrendingUp,
  Cpu
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminDashboard({ setActivePage }) {
  const [analytics, setAnalytics] = useState(null);
  const [config, setConfig] = useState(null);
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configSuccessMsg, setConfigSuccessMsg] = useState('');
  const [configErrorMsg, setConfigErrorMsg] = useState('');

  // Local weights form state
  const [imageWeight, setImageWeight] = useState(40);
  const [textWeight, setTextWeight] = useState(30);
  const [locWeight, setLocWeight] = useState(15);
  const [timeWeight, setTimeWeight] = useState(15);
  const [highThresh, setHighThresh] = useState(80);
  const [possThresh, setPossThresh] = useState(60);

  const loadData = async () => {
    setLoading(true);
    try {
      const [anData, cfgData, repsData] = await Promise.all([
        api.getAnalytics(),
        api.getConfig(),
        api.getAllReports()
      ]);
      setAnalytics(anData);
      setConfig(cfgData);
      setAllReports(repsData);

      if (cfgData) {
        setImageWeight(Math.round(cfgData.image_weight * 100));
        setTextWeight(Math.round(cfgData.text_weight * 100));
        setLocWeight(Math.round(cfgData.location_weight * 100));
        setTimeWeight(Math.round(cfgData.time_weight * 100));
        setHighThresh(Math.round(cfgData.high_threshold * 100));
        setPossThresh(Math.round(cfgData.possible_threshold * 100));
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalWeight = imageWeight + textWeight + locWeight + timeWeight;

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (totalWeight !== 100) {
      setConfigErrorMsg(`The sum of weights must equal 100% (currently ${totalWeight}%).`);
      return;
    }
    try {
      const updated = await api.updateConfig({
        image_weight: imageWeight / 100.0,
        text_weight: textWeight / 100.0,
        location_weight: locWeight / 100.0,
        time_weight: timeWeight / 100.0,
        high_threshold: highThresh / 100.0,
        possible_threshold: possThresh / 100.0,
      });
      setConfig(updated);
      setConfigSuccessMsg('AI multimodal weights & thresholds updated successfully!');
      setConfigErrorMsg('');
    } catch (err) {
      setConfigErrorMsg(err.message || 'Failed to update system config.');
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!confirm(`Are you sure you want to delete Report #${reportId}? Associated matches will be removed.`)) return;
    try {
      await api.deleteReport(reportId);
      setAllReports(prev => prev.filter(r => r.id !== reportId));
      loadData();
    } catch (err) {
      alert(err.message || 'Deletion failed');
    }
  };

  if (loading && !analytics) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading Campus Analytics & Moderation Center...</p>
      </div>
    );
  }

  const kpi = analytics?.kpi || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            <ShieldCheck size={16} />
            <span>INSTITUTIONAL ADMINISTRATION</span>
          </div>
          <h1 style={{ fontSize: '2.25rem' }}>Smart Campus AI Management Portal</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            Live platform metrics, multimodal weights calibration, and report audit moderation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('evaluation')}>
            <BarChart3 size={15} />
            Academic Evaluation Benchmarks
          </button>
          <button className="btn btn-secondary btn-sm" onClick={loadData}>
            <RefreshCw size={15} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(79, 70, 229, 0.15)', color: '#6366f1' }}>
            <BarChart3 size={24} />
          </div>
          <div>
            <div className="stat-value">{kpi.total_reports || 0}</div>
            <div className="stat-label">Total Reports Logged</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
            <Cpu size={24} />
          </div>
          <div>
            <div className="stat-value">{kpi.potential_matches || 0}</div>
            <div className="stat-label">Potential AI Matches</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <Check size={24} />
          </div>
          <div>
            <div className="stat-value">{kpi.confirmed_matches || 0}</div>
            <div className="stat-label">Confirmed Recoveries</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="stat-value">{kpi.matching_success_rate || 0}%</div>
            <div className="stat-label">Recovery Success Rate</div>
          </div>
        </div>
      </div>

      {/* AI Weights & Thresholds Configuration (Requirement 4 & 5) */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 600 }}>
              <Sliders size={16} />
              <span>MULTIMODAL FUSION WEIGHTS CALIBRATION</span>
            </div>
            <h2 style={{ fontSize: '1.4rem' }}>Configure Multimodal Engine Parameters</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Dynamically calibrate the weights allocated to vision, semantic text, campus coordinates, and time difference.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', color: totalWeight === 100 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
              Total Weight: {totalWeight}% {totalWeight === 100 ? '✓' : '(Must sum to 100%)'}
            </span>
          </div>
        </div>

        {configSuccessMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#6ee7b7', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1.25rem', fontSize: '0.875rem' }}>
            ✓ {configSuccessMsg}
          </div>
        )}

        {configErrorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1.25rem', fontSize: '0.875rem' }}>
            ✕ {configErrorMsg}
          </div>
        )}

        <form onSubmit={handleSaveConfig}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
            {/* Image Weight */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#f43f5e', fontWeight: 600 }}>Image Vision Weight</span>
                <strong style={{ fontSize: '1.1rem' }}>{imageWeight}%</strong>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={imageWeight} 
                onChange={e => setImageWeight(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#f43f5e' }}
              />
            </div>

            {/* Text Weight */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#06b6d4', fontWeight: 600 }}>Semantic Text Weight</span>
                <strong style={{ fontSize: '1.1rem' }}>{textWeight}%</strong>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={textWeight} 
                onChange={e => setTextWeight(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#06b6d4' }}
              />
            </div>

            {/* Location Weight */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#10b981', fontWeight: 600 }}>Campus Location Weight</span>
                <strong style={{ fontSize: '1.1rem' }}>{locWeight}%</strong>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={locWeight} 
                onChange={e => setLocWeight(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#10b981' }}
              />
            </div>

            {/* Time Weight */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>Temporal Delta Weight</span>
                <strong style={{ fontSize: '1.1rem' }}>{timeWeight}%</strong>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={timeWeight} 
                onChange={e => setTimeWeight(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#f59e0b' }}
              />
            </div>
          </div>

          {/* Classification Thresholds */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#34d399', fontWeight: 600 }}>High Potential Match Threshold</span>
                <strong style={{ fontSize: '1.1rem' }}>≥ {highThresh}%</strong>
              </div>
              <input 
                type="range" 
                min="50" 
                max="95" 
                value={highThresh} 
                onChange={e => setHighThresh(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#10b981' }}
              />
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#fbbf24', fontWeight: 600 }}>Possible Match Threshold</span>
                <strong style={{ fontSize: '1.1rem' }}>≥ {possThresh}%</strong>
              </div>
              <input 
                type="range" 
                min="30" 
                max="80" 
                value={possThresh} 
                onChange={e => setPossThresh(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#f59e0b' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-sm"
            disabled={totalWeight !== 100}
          >
            <Check size={16} />
            Save & Apply AI Configuration
          </button>
        </form>
      </div>

      {/* Reports by Category & Location Distributions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Category Breakdown */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Tag size={16} style={{ color: 'var(--accent-cyan)' }} />
            Reports by Item Category
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(analytics?.by_category || []).map(cat => (
              <div key={cat.category}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <span>{cat.category}</span>
                  <strong>{cat.count}</strong>
                </div>
                <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (cat.count / (kpi.total_reports || 1)) * 100)}%`, height: '100%', background: 'var(--primary-gradient)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Location Breakdown */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <MapPin size={16} style={{ color: '#10b981' }} />
            Reports by Campus Building
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(analytics?.by_location || []).map(loc => (
              <div key={loc.location}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <span>{loc.location}</span>
                  <strong>{loc.count}</strong>
                </div>
                <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (loc.count / (kpi.total_reports || 1)) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #06b6d4)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reports Moderation Table */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Campus Reports Directory & Moderation ({allReports.length})
        </h3>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Location</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Reporter</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {allReports.map(rep => (
                <tr key={rep.id}>
                  <td>#{rep.id}</td>
                  <td>
                    <span className={`badge ${rep.report_type === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                      {rep.report_type}
                    </span>
                  </td>
                  <td><strong>{rep.item_name}</strong></td>
                  <td>{rep.category}</td>
                  <td>{rep.location}</td>
                  <td>{rep.date} {rep.time}</td>
                  <td>
                    <span className={`badge ${rep.status === 'resolved' ? 'badge-resolved' : 'badge-high'}`}>
                      {rep.status}
                    </span>
                  </td>
                  <td>{rep.user_name || 'Member'}</td>
                  <td>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteReport(rep.id)}
                      title="Delete Report"
                      style={{ padding: '0.3rem 0.5rem' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
