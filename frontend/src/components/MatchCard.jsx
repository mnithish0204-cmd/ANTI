import React from 'react';
import { 
  Sparkles, 
  MapPin, 
  Clock, 
  Check, 
  X, 
  Eye, 
  ShieldCheck, 
  Info, 
  AlertCircle 
} from 'lucide-react';
import { api } from '../services/api';
import { getRealisticItemImage } from '../services/imageResolver';

export default function MatchCard({ match, onSelect, onConfirm, onReject }) {
  const lost = match.lost_report;
  const found = match.found_report;

  const scorePct = Math.round(match.overall_score * 100);
  const imgPct = Math.round(match.image_score * 100);
  const txtPct = Math.round(match.text_score * 100);
  const locPct = Math.round(match.location_score * 100);
  const timPct = Math.round(match.time_score * 100);

  const hasContradiction = Boolean(match.contradiction_warning || (match.conflicting_evidence && match.conflicting_evidence.length > 0));

  const getScoreBadgeClass = () => {
    if (match.classification === 'HIGH_POTENTIAL') return 'score-pill-high';
    if (match.classification === 'POSSIBLE') return 'score-pill-possible';
    return 'score-pill-low';
  };

  const getStatusBadge = () => {
    switch (match.status) {
      case 'CONFIRMED':
        return <span className="badge badge-resolved"><ShieldCheck size={12} /> Confirmed Match</span>;
      case 'REJECTED':
        return <span className="badge badge-low"><X size={12} /> Rejected</span>;
      case 'REQUESTED':
        return <span className="badge badge-possible"><Clock size={12} /> Verification Pending</span>;
      default:
        return (
          <span className={`badge ${match.classification === 'HIGH_POTENTIAL' ? 'badge-high' : 'badge-possible'}`}>
            <Sparkles size={12} /> {match.classification.replace('_', ' ')}
          </span>
        );
    }
  };

  return (
    <div className="match-card">
      {/* Header with Classification & Score */}
      <div className="match-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {getStatusBadge()}
          {match.verification_status === 'verified' && (
            <span className="badge badge-resolved" style={{ fontSize: '0.72rem' }}>
              ✓ Ownership Verified
            </span>
          )}
          {match.evidence_quality && (
            <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-sub)', fontSize: '0.72rem' }}>
              Quality: {match.evidence_quality}
            </span>
          )}
        </div>
        <div className={`match-score-pill ${getScoreBadgeClass()}`}>
          <Sparkles size={14} />
          <span>{scorePct}% Match</span>
        </div>
      </div>

      {/* Side-by-Side Realistic Images */}
      <div className="match-comparison-hero">
        {/* Lost Item */}
        <div className="match-item-column">
          <div className="match-img-wrapper">
            <span className="match-img-tag badge-lost">Lost</span>
            <img 
              src={getRealisticItemImage(lost)} 
              alt={lost?.item_name || 'Lost Item'} 
            />
          </div>
          <div className="match-item-title" title={lost?.item_name}>
            {lost?.item_name || 'Lost Item'}
          </div>
          <div className="match-item-meta">
            <MapPin size={12} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {lost?.building || lost?.location}
            </span>
          </div>
        </div>

        {/* VS Indicator */}
        <div className="match-vs-divider">VS</div>

        {/* Found Item */}
        <div className="match-item-column">
          <div className="match-img-wrapper">
            <span className="match-img-tag badge-found">Found</span>
            <img 
              src={getRealisticItemImage(found)} 
              alt={found?.item_name || 'Found Item'} 
            />
          </div>
          <div className="match-item-title" title={found?.item_name}>
            {found?.item_name || 'Found Item'}
          </div>
          <div className="match-item-meta">
            <MapPin size={12} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {found?.building || found?.location}
            </span>
          </div>
        </div>
      </div>

      {/* Multimodal Breakdown Meters */}
      <div className="modality-breakdown">
        {/* Image Score */}
        <div className="meter-item">
          <div className="meter-header">
            <span>Image Similarity</span>
            <span style={{ fontWeight: 600 }}>{imgPct}%</span>
          </div>
          <div className="meter-bar">
            <div className="meter-fill fill-image" style={{ width: `${imgPct}%` }} />
          </div>
        </div>

        {/* Text Score */}
        <div className="meter-item">
          <div className="meter-header">
            <span>Description</span>
            <span style={{ fontWeight: 600 }}>{txtPct}%</span>
          </div>
          <div className="meter-bar">
            <div className="meter-fill fill-text" style={{ width: `${txtPct}%` }} />
          </div>
        </div>

        {/* Location Score */}
        <div className="meter-item">
          <div className="meter-header">
            <span>Campus Location</span>
            <span style={{ fontWeight: 600 }}>{locPct}%</span>
          </div>
          <div className="meter-bar">
            <div className="meter-fill fill-loc" style={{ width: `${locPct}%` }} />
          </div>
        </div>

        {/* Time Score */}
        <div className="meter-item">
          <div className="meter-header">
            <span>Temporal Interval</span>
            <span style={{ fontWeight: 600 }}>{timPct}%</span>
          </div>
          <div className="meter-bar">
            <div className="meter-fill fill-time" style={{ width: `${timPct}%` }} />
          </div>
        </div>
      </div>

      {/* Contradiction Warning Banner if detected */}
      {hasContradiction && (
        <div 
          style={{ 
            margin: '0.65rem 0.85rem 0',
            padding: '0.5rem 0.75rem', 
            borderRadius: '6px', 
            background: 'rgba(245, 158, 11, 0.12)', 
            border: '1px solid rgba(245, 158, 11, 0.4)', 
            color: '#fcd34d', 
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0, color: '#f59e0b' }} />
          <span>⚠️ Contradiction: Conflicting location or temporal evidence</span>
        </div>
      )}

      {/* Dynamic Explainable AI Reasoning Box */}
      <div className="xai-explanation-box">
        <div className="xai-title">
          <Sparkles size={14} />
          <span>Explainable AI Insights</span>
        </div>
        <p className="xai-text">
          {match.explanation || 'AI evaluated multimodal similarities across feature vectors, description tokens, campus proximity, and time stamps.'}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="match-card-actions">
        <button 
          className="btn btn-secondary btn-sm"
          style={{ flex: 1 }}
          onClick={() => onSelect(match)}
        >
          <Eye size={14} />
          View Details
        </button>

        {match.status !== 'CONFIRMED' && match.status !== 'REJECTED' && (
          <>
            <button 
              className="btn btn-success btn-sm"
              onClick={() => onConfirm(match.id)}
              title="Confirm Match & Reveal Finder"
            >
              <Check size={14} />
              Confirm Match
            </button>
            <button 
              className="btn btn-danger btn-sm"
              onClick={() => onReject(match.id)}
              title="Dismiss / Reject Match"
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
