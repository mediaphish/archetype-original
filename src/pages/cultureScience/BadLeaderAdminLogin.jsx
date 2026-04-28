import React, { useState } from 'react';
import SEO from '../../components/SEO';

function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function BadLeaderAdminLogin() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await fetch('/api/bad-leader-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send link.');
      setMessage('Magic link sent. Check your email.');
      if (data.link) {
        setMessage(`Magic link sent. Development link: ${data.link}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to send link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SEO pageKey="bad-leader-project" />
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#FAFAF9', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 420, border: '1px solid rgba(26,26,26,0.1)', background: '#fff', padding: 36 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8B7D72', marginBottom: 8 }}>
            Bad Leader Project
          </p>
          <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 400, fontSize: 28, margin: '0 0 8px' }}>
            Admin Sign In
          </h1>
          <p style={{ color: '#6B6B6B', fontSize: 14, marginBottom: 24 }}>
            Enter your email to receive a secure magic link.
          </p>
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={{
                width: '100%',
                height: 44,
                border: '1px solid rgba(26,26,26,0.15)',
                borderRadius: 2,
                background: '#FAFAF9',
                padding: '0 14px',
                marginBottom: 14,
                fontSize: 14,
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: 44,
                border: 'none',
                borderRadius: 2,
                background: '#2B2929',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
          {message && <p style={{ marginTop: 12, fontSize: 13, color: '#1A1A1A', wordBreak: 'break-word' }}>{message}</p>}
          {error && <p style={{ marginTop: 12, fontSize: 13, color: '#DB0812' }}>{error}</p>}
          <button
            type="button"
            onClick={() => navigate('/culture-science/anti-projects/bad-leader-project')}
            style={{ marginTop: 16, border: 'none', background: 'none', color: '#6B6B6B', cursor: 'pointer', padding: 0 }}
          >
            Back to public page
          </button>
        </div>
      </div>
    </>
  );
}
