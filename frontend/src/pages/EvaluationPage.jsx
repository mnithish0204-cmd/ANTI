import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  BarChart3, 
  CheckCircle, 
  TrendingUp, 
  RefreshCw, 
  Info, 
  Sliders,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';

export default function EvaluationPage({ setActivePage }) {
  const [evalData, setEvalData] = useState(null);
  const [threshold, setThreshold] = useState(60); // 0.60 default
  const [loading, setLoading] = useState(true);

  const fetchEvaluation = async (threshVal) => {
    setLoading(true);
    try {
      const data = await api.getEvaluation(threshVal / 100.0);
      setEvalData(data);
    } catch (err) {
      console.error('Failed to run evaluation benchmark', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluation(threshold);
  }, [threshold]);

  const methods = evalData?.methods || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            <Layers size={16} />
            <span>ACADEMIC RESEARCH & BENCHMARKING</span>
          </div>
          <h1 style={{ fontSize: '2.25rem' }}>Multimodal Evaluation & Comparative Analysis</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
            Empirical validation of our proposed Multimodal framework against text-only, vision-only, and bi-modal baselines.
          </p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={() => fetchEvaluation(threshold)}>
          <RefreshCw size={15} />
          Recalculate Metrics
        </button>
      </div>

      {/* Decision Threshold Controller Slider */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sliders size={16} style={{ color: 'var(--accent-cyan)' }} />
            Decision Classification Threshold: <strong style={{ color: '#6ee7b7' }}>{threshold}% ({threshold / 100})</strong>
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Adjust the confidence threshold at which pairs are classified as a positive match to evaluate the Precision-Recall tradeoff curve.
          </p>
        </div>

        <div style={{ width: '320px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>40%</span>
          <input 
            type="range" 
            min="40" 
            max="85" 
            value={threshold} 
            onChange={e => setThreshold(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--primary)' }}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>85%</span>
        </div>
      </div>

      {/* Comparative Metrics Table */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Quantitative Benchmark Results (Ground Truth Pairs: {evalData?.total_ground_truth_pairs || 0})
        </h3>
        
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Method / Paradigm</th>
                <th>Precision</th>
                <th>Recall</th>
                <th>F1-Score</th>
                <th>Accuracy</th>
                <th>Mean Similarity</th>
                <th>Performance Status</th>
              </tr>
            </thead>
            <tbody>
              {methods.map((m, idx) => {
                const isProposed = idx === 3;
                return (
                  <tr 
                    key={m.method_name}
                    style={{ 
                      background: isProposed ? 'rgba(79, 70, 229, 0.12)' : 'transparent',
                      fontWeight: isProposed ? 600 : 400
                    }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isProposed && <span className="badge badge-high" style={{ fontSize: '0.65rem' }}>PROPOSED</span>}
                        <span>{m.method_name}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {m.description}
                      </div>
                    </td>
                    <td>
                      <span style={{ color: m.precision >= 0.8 ? '#10b981' : m.precision >= 0.6 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>
                        {(m.precision * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span style={{ color: m.recall >= 0.8 ? '#10b981' : m.recall >= 0.6 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>
                        {(m.recall * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span style={{ color: m.f1_score >= 0.8 ? '#10b981' : m.f1_score >= 0.6 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>
                        {(m.f1_score * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span style={{ color: '#cbd5e1' }}>
                        {(m.accuracy * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span>{(m.average_score * 100).toFixed(1)}%</span>
                    </td>
                    <td>
                      {isProposed ? (
                        <span className="badge badge-resolved">Superior F1 & Context</span>
                      ) : m.precision === 0 ? (
                        <span className="badge badge-low">High False Negatives</span>
                      ) : (
                        <span className="badge badge-possible">Baseline</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Comparison Metric Bars */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart3 size={18} style={{ color: 'var(--accent-cyan)' }} />
          Comparative F1-Score & Precision Metric Breakdown
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {methods.map((m, idx) => {
            const isProposed = idx === 3;
            const f1Pct = Math.round(m.f1_score * 100);
            const precPct = Math.round(m.precision * 100);
            const recPct = Math.round(m.recall * 100);

            return (
              <div key={m.method_name} className="glass-card" style={{ border: isProposed ? '1px solid var(--border-glow)' : '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong>{m.method_name}</strong>
                    {isProposed && <span className="badge badge-high" style={{ fontSize: '0.65rem' }}>Proposed Multimodal</span>}
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>F1: </span>
                    <strong style={{ color: isProposed ? '#34d399' : 'var(--text-main)', fontSize: '1.05rem' }}>{f1Pct}%</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      <span>Precision</span>
                      <span>{precPct}%</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{ width: `${precPct}%`, height: '100%', background: '#06b6d4' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      <span>Recall</span>
                      <span>{recPct}%</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{ width: `${recPct}%`, height: '100%', background: '#10b981' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      <span>F1-Score</span>
                      <span>{f1Pct}%</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{ width: `${f1Pct}%`, height: '100%', background: isProposed ? 'var(--primary-gradient)' : '#6366f1' }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Research Methodology Notes */}
      <div className="glass-panel" style={{ padding: '1.75rem', background: 'rgba(15, 23, 42, 0.6)' }}>
        <h4 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)' }}>
          <Info size={16} />
          Academic Discussion & Findings
        </h4>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-sub)', lineHeight: 1.6 }}>
          1. <strong>Keyword/Text-Only (Method 1)</strong> yields low recall and high false negatives when users utilize divergent vocabularies (e.g., "Bluetooth headset" vs "wireless headphones").<br />
          2. <strong>Image-Only (Method 2)</strong> exhibits high recall but struggles with precision because dark backgrounds or generic geometric forms can trigger false positive matches.<br />
          3. <strong>Proposed Context-Aware Multimodal (Method 4)</strong> incorporates smart campus spatial ontology and temporal interval penalties, successfully filtering out cross-campus coincidences and achieving superior F1-score and real-world precision.
        </p>
      </div>
    </div>
  );
}
