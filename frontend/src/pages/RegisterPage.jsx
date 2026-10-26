import React, { useState } from 'react';
import { Sparkles, UserPlus, User, Mail, Lock, Phone, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage({ setActivePage }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [campusId, setCampusId] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register({
        name,
        email,
        password,
        phone,
        campus_id: campusId,
        role
      });
      setActivePage('dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '520px', margin: '2rem auto' }}>
      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div className="nav-logo-icon" style={{ margin: '0 auto 0.75rem', width: 44, height: 44 }}>
            <Sparkles size={22} />
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Campus Registration</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Create an account to report items and receive AI matching alerts
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.75rem', borderRadius: 8, marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label">Full Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Aarav Sharma" 
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="form-label">Campus Email *</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="name@campus.edu" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="form-label">Campus ID (STU-XXXX) *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="STU-10822" 
                value={campusId}
                onChange={e => setCampusId(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">Phone Number</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="+91 98450 11223" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Primary Role</label>
            <select 
              className="form-select"
              value={role}
              onChange={e => setRole(e.target.value)}
            >
              <option value="student">Student / Campus Member</option>
              <option value="finder">Good Samaritan / Finder</option>
              <option value="admin">Campus Administrator</option>
            </select>
          </div>

          <div>
            <label className="form-label">Password *</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            <UserPlus size={16} />
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Already registered?{' '}
          <button 
            style={{ background: 'transparent', color: 'var(--accent-cyan)', fontWeight: 600 }}
            onClick={() => setActivePage('login')}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
