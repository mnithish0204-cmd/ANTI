import React, { useState } from 'react';
import { Sparkles, LogIn, Lock, Mail, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ setActivePage }) {
  const { login, switchDemoUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      setActivePage('dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (key) => {
    setLoading(true);
    try {
      await switchDemoUser(key);
      setActivePage('dashboard');
    } catch (err) {
      setError('Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '3rem auto' }}>
      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="nav-logo-icon" style={{ margin: '0 auto 1rem', width: 48, height: 48 }}>
            <Sparkles size={24} />
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Smart Campus Sign In</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Access the multimodal lost and found matching system
          </p>
        </div>

        {/* 1-Click Demo Quick Logins */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.775rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.65rem' }}>
            Quick Demo Accounts (1-Click)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start', fontSize: '0.85rem' }}
              onClick={() => handleDemo('aarav')}
            >
              <User size={14} style={{ color: '#ef4444' }} />
              <span><strong>Aarav Sharma</strong> · Student (Lost Headphones Owner)</span>
            </button>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start', fontSize: '0.85rem' }}
              onClick={() => handleDemo('rahul')}
            >
              <User size={14} style={{ color: '#06b6d4' }} />
              <span><strong>Rahul Kumar</strong> · Finder (Reported Headset)</span>
            </button>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start', fontSize: '0.85rem' }}
              onClick={() => handleDemo('admin')}
            >
              <ShieldCheck size={14} style={{ color: '#10b981' }} />
              <span><strong>Dr. Priya Patel</strong> · Campus Administrator</span>
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.75rem', borderRadius: 8, marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="form-label">Campus Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-muted)' }} />
              <input 
                type="email" 
                className="form-input" 
                placeholder="student@campus.edu" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                className="form-input" 
                placeholder="••••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            <LogIn size={16} />
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <button 
            style={{ background: 'transparent', color: 'var(--accent-cyan)', fontWeight: 600 }}
            onClick={() => setActivePage('register')}
          >
            Register here
          </button>
        </div>
      </div>
    </div>
  );
}
