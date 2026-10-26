import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  MapPin, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Phone, 
  Mail, 
  User, 
  Tag, 
  Check, 
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  KeyRound
} from 'lucide-react';
import { api } from '../services/api';
import { getRealisticItemImage } from '../services/imageResolver';

export default function MatchDetailModal({ match, onClose, onConfirm, onReject }) {
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Hidden-Attribute Ownership Verification state
  const [claimedDetail, setClaimedDetail] = useState('');
  const [verifyingOwnership, setVerifyingOwnership] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(match?.verification_status || 'not_verified');
  const [verificationFeedback, setVerificationFeedback] = useState(match?.ownership_verification_result || '');
  const [explanation, setExplanation] = useState(match?.explanation || '');

  if (!match) return null;

  const lost = match.lost_report;
  const found = match.found_report;
  const finder = match.finder_contact;
  const isConfirmed = match.status === 'CONFIRMED';

  const supporting = match.supporting_evidence || [];
  const conflicting = match.conflicting_evidence || [];
  const hasContradiction = Boolean(match.contradiction_warning || conflicting.length > 0);

  const handleConfirmAction = async () => {
    setConfirming(true);
    try {
      await onConfirm(match.id);
      setActionSuccessMsg('Match successfully confirmed! Finder contact details are unlocked below.');
    } catch (err) {
      alert(err.message || 'Confirmation failed');
    } finally {
      setConfirming(false);
    }
  };

  const handleRejectAction = async () => {
    if (!confirm('Are you sure you wish to reject this match candidate?')) return;
    setRejecting(true);
    try {
      await onReject(match.id);
      onClose();
    } catch (err) {
      alert(err.message || 'Rejection failed');
    } finally {
      setRejecting(false);
    }
  };

  const handleVerifyOwnership = async (e) => {
    e.preventDefault();
    if (!claimedDetail.trim()) return;
    setVerifyingOwnership(true);
    try {
      const res = await api.verifyOwnership(match.id, claimedDetail.trim());
      setVerificationStatus(res.verification_status);
      setVerificationFeedback(res.message);
      match.verification_status = res.verification_status;
      match.ownership_verification_result = res.message;
      if (res.verification_status === 'verified') {
        setExplanation(prev => {
          if (!prev.includes('private ownership detail was')) {
            return prev + ' The private ownership detail was verified.';
          }
          return prev;
        });
      }
    } catch (err) {
      setVerificationFeedback(err.message || 'Verification request failed');
    } finally {
      setVerifyingOwnership(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="score-pill-high" style={{ padding: '0.4rem 0.85rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={16} />
              <span style={{ fontWeight: 700 }}>{Math.round(match.overall_score * 100)}% Multimodal Match</span>
            </div>
            <span className="badge badge-high">{match.classification.replace('_', ' ')}</span>
            {match.evidence_quality && (
              <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-sub)' }}>
                Evidence Quality: {match.evidence_quality}
              </span>
            )}
            {verificationStatus === 'verified' && (
              <span className="badge badge-resolved">
                ✓ Ownership Verified
              </span>
            )}
          </div>

          <button 
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ borderRadius: '50%', width: 34, height: 34, padding: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {actionSuccessMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#6ee7b7', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            ✓ {actionSuccessMsg}
          </div>
        )}

        {/* Contradiction Warning Alert Banner if conflicting evidence detected */}
        {hasContradiction && (
          <div 
            style={{ 
              background: 'rgba(245, 158, 11, 0.12)', 
              border: '1px solid rgba(245, 158, 11, 0.5)', 
              color: '#fcd34d', 
              padding: '0.85rem 1.15rem', 
              borderRadius: '8px', 
              marginBottom: '1.25rem', 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '0.65rem' 
            }}
          >
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '0.15rem', color: '#f59e0b' }} />
            <div>
              <strong style={{ display: 'block', fontSize: '0.92rem', marginBottom: '0.2rem' }}>
                Contradictory Evidence Detected
              </strong>
              <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.4, color: '#fef3c7' }}>
                {match.contradiction_warning || 'Strong visual or description similarity was detected, but reported campus locations or event times show low consistency. Manual verification is recommended.'}
              </p>
            </div>
          </div>
        )}

        {/* Explainable AI Insights Section */}
        <div className="xai-explanation-box" style={{ margin: '0 0 1.5rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div className="xai-title" style={{ margin: 0 }}>
              <Sparkles size={16} />
              <span>Explainable AI Insights</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-sub)', fontSize: '0.75rem' }}>
                Evidence Quality: {match.evidence_quality || 'Good'}
              </span>
            </div>
          </div>

          <p className="xai-text" style={{ fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.5 }}>
            {explanation || match.explanation}
          </p>

          {/* Supporting & Conflicting Evidence Lists */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Supporting Evidence */}
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Check size={14} /> Supporting Evidence ({supporting.length})
              </div>
              {supporting.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Standard multimodal correlation</div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: 'var(--text-sub)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {supporting.map((s, idx) => (
                    <li key={idx} style={{ lineHeight: 1.35 }}>{s}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Conflicting Evidence */}
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: conflicting.length > 0 ? '#f59e0b' : 'var(--text-muted)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertCircle size={14} /> Conflicting Evidence ({conflicting.length})
              </div>
              {conflicting.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No conflicting modality evidence detected</div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: '#fcd34d', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {conflicting.map((c, idx) => (
                    <li key={idx} style={{ lineHeight: 1.35 }}>{c}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Modality Quantitative Scores & Qualitative Consistency */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="glass-card" style={{ textAlign: 'center', padding: '0.85rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Image Similarity</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f43f5e' }}>
              {Math.round(match.image_score * 100)}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)', marginTop: '0.2rem' }}>
              {match.image_score >= 0.80 ? 'High Similarity' : match.image_score >= 0.60 ? 'Moderate Similarity' : 'Low Similarity'}
            </div>
          </div>
          <div className="glass-card" style={{ textAlign: 'center', padding: '0.85rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Text Similarity</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#06b6d4' }}>
              {Math.round(match.text_score * 100)}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)', marginTop: '0.2rem' }}>
              {match.text_score >= 0.75 ? 'High Alignment' : match.text_score >= 0.55 ? 'Moderate Alignment' : 'Low Alignment'}
            </div>
          </div>
          <div className="glass-card" style={{ textAlign: 'center', padding: '0.85rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Campus Location</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>
              {match.location_score >= 0.80 ? 'High' : match.location_score >= 0.60 ? 'Moderate' : 'Low'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)', marginTop: '0.2rem' }}>
              {match.location_score >= 0.80 ? 'High Consistency' : match.location_score >= 0.60 ? 'Moderate Consistency' : 'Separated Areas'} ({Math.round(match.location_score * 100)}%)
            </div>
          </div>
          <div className="glass-card" style={{ textAlign: 'center', padding: '0.85rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Temporal Match</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>
              {match.time_score >= 0.80 ? 'High' : match.time_score >= 0.60 ? 'Moderate' : 'Low'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)', marginTop: '0.2rem' }}>
              {match.time_score >= 0.80 ? 'High Consistency' : match.time_score >= 0.60 ? 'Moderate Consistency' : 'Time Interval Differs'} ({Math.round(match.time_score * 100)}%)
            </div>
          </div>
        </div>

        {/* Side-by-Side Detailed Comparison Table with Realistic Visuals */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Lost Report Card */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '3px solid #ef4444' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span className="badge badge-lost">Reported Lost Item</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Report #{lost?.id}</span>
            </div>

            <div style={{ width: '100%', height: '180px', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.75rem', background: '#000' }}>
              <img 
                src={getRealisticItemImage(lost)} 
                alt={lost?.item_name || 'Lost item photo'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{lost?.item_name}</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', marginBottom: '0.75rem', lineHeight: '1.4' }}>
              {lost?.description}
            </p>

            <div style={{ fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', color: 'var(--text-muted)' }}>
              <div><strong style={{ color: 'var(--text-main)' }}>Category:</strong> {lost?.category}</div>
              <div><strong style={{ color: 'var(--text-main)' }}>Brand / Model:</strong> {lost?.brand} {lost?.model}</div>
              <div><strong style={{ color: 'var(--text-main)' }}>Distinctive Marks:</strong> {lost?.distinctive_features || 'None reported'}</div>
              <div><strong style={{ color: 'var(--text-main)' }}>Location:</strong> {lost?.location} ({lost?.building})</div>
              <div><strong style={{ color: 'var(--text-main)' }}>Lost Date & Time:</strong> {lost?.date} at {lost?.time}</div>
            </div>
          </div>

          {/* Found Report Card */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '3px solid #06b6d4' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span className="badge badge-found">Reported Found Item</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Report #{found?.id}</span>
            </div>

            <div style={{ width: '100%', height: '180px', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.75rem', background: '#000' }}>
              <img 
                src={getRealisticItemImage(found)} 
                alt={found?.item_name || 'Found item photo'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{found?.item_name}</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', marginBottom: '0.75rem', lineHeight: '1.4' }}>
              {found?.description}
            </p>

            <div style={{ fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', color: 'var(--text-muted)' }}>
              <div><strong style={{ color: 'var(--text-main)' }}>Category:</strong> {found?.category}</div>
              <div><strong style={{ color: 'var(--text-main)' }}>Brand / Model:</strong> {found?.brand} {found?.model}</div>
              <div><strong style={{ color: 'var(--text-main)' }}>Distinctive Marks:</strong> {found?.distinctive_features || 'None reported'}</div>
              <div><strong style={{ color: 'var(--text-main)' }}>Location:</strong> {found?.location} ({found?.building})</div>
              <div><strong style={{ color: 'var(--text-main)' }}>Found Date & Time:</strong> {found?.date} at {found?.time}</div>
            </div>
          </div>
        </div>

        {/* Feature 3: Hidden-Attribute Ownership Verification Section */}
        <div 
          className="glass-panel" 
          style={{ 
            padding: '1.35rem', 
            marginBottom: '1.5rem',
            background: verificationStatus === 'verified' 
              ? 'rgba(16, 185, 129, 0.08)' 
              : 'rgba(15, 23, 42, 0.8)',
            border: verificationStatus === 'verified' 
              ? '1px solid #10b981' 
              : '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={18} style={{ color: verificationStatus === 'verified' ? '#10b981' : 'var(--accent-cyan)' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                Hidden-Attribute Ownership Verification
              </h4>
            </div>

            {verificationStatus === 'verified' ? (
              <span className="badge badge-resolved">
                <ShieldCheck size={13} /> Verified Owner Detail
              </span>
            ) : verificationStatus === 'manual_review' ? (
              <span className="badge badge-possible">
                <AlertTriangle size={13} /> Manual Review Recommended
              </span>
            ) : verificationStatus === 'not_verified' ? (
              <span className="badge badge-low">
                Not Verified
              </span>
            ) : (
              <span className="badge" style={{ background: 'rgba(255,255,255,0.08)' }}>
                No Private Attribute
              </span>
            )}
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', marginBottom: '0.85rem', lineHeight: 1.4 }}>
            The original lost-item reporter can record a secret identifying detail (such as internal marks, hidden tears, or stickers) that is never displayed publicly. Provide this identifying attribute below to verify ownership.
          </p>

          {/* Verification Input & Action */}
          <form onSubmit={handleVerifyOwnership} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Small tear inside left card slot, scratch near bottom hinge..."
              value={claimedDetail}
              onChange={e => setClaimedDetail(e.target.value)}
              style={{ flex: 1, minWidth: '260px' }}
              disabled={verifyingOwnership}
            />
            <button 
              type="submit" 
              className="btn btn-secondary btn-sm"
              disabled={verifyingOwnership || !claimedDetail.trim()}
              style={{ padding: '0.65rem 1.25rem', whiteSpace: 'nowrap' }}
            >
              {verifyingOwnership ? 'Verifying with AI...' : 'Verify Ownership Detail'}
            </button>
          </form>

          {/* Verification Feedback Banner */}
          {verificationFeedback && (
            <div 
              style={{ 
                marginTop: '0.75rem', 
                padding: '0.65rem 0.85rem', 
                borderRadius: '6px', 
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: verificationStatus === 'verified' 
                  ? 'rgba(16, 185, 129, 0.15)' 
                  : verificationStatus === 'manual_review'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${
                  verificationStatus === 'verified' 
                    ? '#10b981' 
                    : verificationStatus === 'manual_review'
                    ? '#f59e0b'
                    : '#ef4444'
                }`,
                color: verificationStatus === 'verified' 
                  ? '#6ee7b7' 
                  : verificationStatus === 'manual_review'
                  ? '#fcd34d'
                  : '#fca5a5'
              }}
            >
              {verificationStatus === 'verified' ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{verificationFeedback}</span>
            </div>
          )}
        </div>

        {/* Finder Contact Details (Privacy-Preserving Section) */}
        <div 
          className="glass-panel" 
          style={{ 
            padding: '1.25rem', 
            marginBottom: '1.5rem', 
            background: isConfirmed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.8)',
            border: isConfirmed ? '1px solid #10b981' : '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isConfirmed ? (
                <Unlock size={18} style={{ color: '#10b981' }} />
              ) : (
                <Lock size={18} style={{ color: 'var(--warning)' }} />
              )}
              <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                {isConfirmed ? 'Finder Information (Unlocked for Recovery)' : 'Finder Information (Protected by Privacy Shield)'}
              </h4>
            </div>

            {isConfirmed ? (
              <span className="badge badge-resolved">Verified Contact</span>
            ) : (
              <span className="badge badge-possible">Confidential</span>
            )}
          </div>

          {isConfirmed ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <User size={16} style={{ color: 'var(--accent-cyan)' }} />
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Finder Name</div>
                  <strong>{finder?.name}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <Tag size={16} style={{ color: 'var(--accent-cyan)' }} />
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Campus ID</div>
                  <strong>{finder?.campus_id}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <Phone size={16} style={{ color: 'var(--accent-cyan)' }} />
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Phone Number</div>
                  <strong>{finder?.phone}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', gridColumn: 'span 2' }}>
                <Mail size={16} style={{ color: 'var(--accent-cyan)' }} />
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Campus Email</div>
                  <strong>{finder?.email}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <MapPin size={16} style={{ color: 'var(--accent-cyan)' }} />
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Recovery Handover</div>
                  <strong>{finder?.found_location}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                {finder?.privacy_notice || 'Personal contact information (name, phone, campus ID) is protected. Confirm this match to unlock contact coordinates and coordinate item collection.'}
              </p>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.825rem', color: 'var(--text-sub)' }}>
                <div><strong>Status:</strong> {finder?.name}</div>
                <div><strong>Found Location:</strong> {finder?.found_location}</div>
                <div><strong>Date:</strong> {finder?.found_date}</div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>

          {!isConfirmed && match.status !== 'REJECTED' && (
            <>
              <button 
                className="btn btn-danger"
                onClick={handleRejectAction}
                disabled={rejecting}
              >
                {rejecting ? 'Rejecting...' : 'Reject Match'}
              </button>

              <button 
                className="btn btn-success"
                onClick={handleConfirmAction}
                disabled={confirming}
                style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}
              >
                <Check size={18} />
                {confirming ? 'Verifying & Confirming...' : 'Confirm Match & Reveal Contact'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
