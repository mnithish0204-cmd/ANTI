import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Search, 
  PlusCircle, 
  ShieldCheck, 
  Cpu, 
  MapPin, 
  Clock, 
  FileText, 
  ArrowRight,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { api } from '../services/api';

export default function LandingPage({ setActivePage }) {
  const [stats, setStats] = useState({
    total_lost: 4,
    total_found: 4,
    potential_matches: 4,
    resolved: 1
  });

  useEffect(() => {
    api.getAllReports().then(reports => {
      if (reports) {
        const lost = reports.filter(r => r.report_type === 'lost').length;
        const found = reports.filter(r => r.report_type === 'found').length;
        const resolved = reports.filter(r => r.status === 'resolved').length;
        setStats(prev => ({ ...prev, total_lost: lost, total_found: found, resolved }));
      }
    }).catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
      {/* Hero Section */}
      <section 
        className="glass-panel" 
        style={{ 
          padding: '4rem 3rem', 
          position: 'relative', 
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(18, 26, 43, 0.95) 0%, rgba(10, 14, 23, 0.9) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)'
        }}
      >
        <div style={{ maxWidth: '750px', position: 'relative', zIndex: 2 }}>
          <div 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.35rem 0.85rem', 
              borderRadius: '9999px', 
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: 'var(--accent-cyan)',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1.25rem'
            }}
          >
            <Sparkles size={16} />
            <span>Next-Gen Smart Campus Multimodal Matching</span>
          </div>

          <h1 style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.25rem' }}>
            Reuniting Campus Items with <span style={{ background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Multimodal AI</span>
          </h1>

          <p style={{ fontSize: '1.15rem', color: 'var(--text-sub)', marginBottom: '2rem', lineHeight: 1.6 }}>
            Traditional keyword search fails when lost item descriptions differ. Our system analyzes 
            <strong> images, semantic context, smart campus building ontology, and temporal proximity</strong> 
            to automatically match, rank, and explain lost and found items.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-primary" 
              style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}
              onClick={() => setActivePage('report-lost')}
            >
              <PlusCircle size={18} />
              I Lost an Item
            </button>

            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}
              onClick={() => setActivePage('report-found')}
            >
              <CheckCircle2 size={18} style={{ color: 'var(--accent-cyan)' }} />
              I Found an Item
            </button>

            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.85rem 1.5rem', fontSize: '1rem' }}
              onClick={() => setActivePage('matches')}
            >
              <Sparkles size={18} style={{ color: 'var(--accent-cyan)' }} />
              View AI Matches
            </button>
          </div>
        </div>
      </section>

      {/* 4 Pillars of Multimodal AI */}
      <section>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Multimodal AI Architecture</h2>
          <p style={{ color: 'var(--text-muted)' }}>How our four-layer context-aware matching engine calculates similarity</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {/* Pillar 1: Vision */}
          <div className="glass-card">
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Cpu size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>1. Computer Vision (40%)</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-sub)', lineHeight: 1.5 }}>
              Dense multi-scale HSV color histograms, spatial grid luminance moments, and edge/contour gradients capture shapes, logos, and scratches.
            </p>
          </div>

          {/* Pillar 2: Semantic NLP */}
          <div className="glass-card">
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <FileText size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>2. Semantic Text (30%)</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-sub)', lineHeight: 1.5 }}>
              Understands conceptual similarity beyond keywords: recognizing that "dark black Bluetooth headset" matches "black wireless headphones".
            </p>
          </div>

          {/* Pillar 3: Location */}
          <div className="glass-card">
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <MapPin size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>3. Campus Proximity (15%)</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-sub)', lineHeight: 1.5 }}>
              Smart campus ontology incorporating building blueprints, floor differences, and GPS Haversine distance decay curves.
            </p>
          </div>

          {/* Pillar 4: Time */}
          <div className="glass-card">
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Clock size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>4. Temporal Closeness (15%)</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-sub)', lineHeight: 1.5 }}>
              Exponential time-decay curve rewarding reports occurring close together while permitting multi-day recovery intervals.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy & Confirmation Workflow Highlight */}
      <section className="glass-panel" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              <ShieldCheck size={18} />
              <span>Zero-Dox Privacy Architecture</span>
            </div>
            <h2 style={{ fontSize: '1.85rem', marginBottom: '1rem' }}>Secure Two-Way Match Confirmation</h2>
            <p style={{ color: 'var(--text-sub)', lineHeight: 1.6, marginBottom: '1.25rem', fontSize: '0.95rem' }}>
              Finder contact information is strictly protected by default. Before confirmation, reports only reveal anonymized campus status. Once a match is confirmed by the owner or administrator, verified contact coordinates are unlocked for safe item recovery.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <Lock size={16} style={{ color: 'var(--warning)' }} />
                <span>Masked Prior to Confirmation</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <ShieldCheck size={16} style={{ color: '#10b981' }} />
                <span>Unlocked Upon Verification</span>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid var(--border-glow)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '0.75rem' }}>
              WORKFLOW PROGRESSION
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.65rem 1rem', borderRadius: 8 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>1</span>
                <span>User reports Lost / Found Item with photo</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.65rem 1rem', borderRadius: 8 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>2</span>
                <span>AI computes Multimodal Similarity & Explanations</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.65rem 1rem', borderRadius: 8 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>3</span>
                <span>Owner receives In-App Notification with side-by-side card</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '0.65rem 1rem', borderRadius: 8, color: '#6ee7b7' }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>4</span>
                <span>Confirmation Unlocks Verified Finder Contact for Handover</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
