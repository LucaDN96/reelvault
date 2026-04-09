import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../services/api.js';

export default function ConnectTelegramScreen() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status,  setStatus]  = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');

  // Redirect to auth if not logged in, preserving the connect URL
  useEffect(() => {
    if (session === undefined) return; // still loading
    if (!session) {
      navigate(`/app/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`, { replace: true });
    }
  }, [session]);

  if (!token) {
    return (
      <div className="connect-screen">
        <div className="connect-card">
          <div className="connect-icon">❌</div>
          <h1 className="connect-title">Invalid link</h1>
          <p className="connect-sub">This link is missing a token. Go back to Telegram and use /start to get a new link.</p>
          <button className="btn btn-ghost" onClick={() => navigate('/app')}>Back to app</button>
        </div>
      </div>
    );
  }

  async function handleConnect() {
    setStatus('loading');
    try {
      await api.telegram.connect(token);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setMessage(err.data?.message || err.message || 'Something went wrong. The link may have expired.');
    }
  }

  if (status === 'success') {
    return (
      <div className="connect-screen">
        <div className="connect-card">
          <div className="connect-icon">✅</div>
          <h1 className="connect-title">Telegram connected!</h1>
          <p className="connect-sub">Your account is linked. Go back to Telegram and send any Instagram link to save it.</p>
          <button className="btn btn-primary" onClick={() => navigate('/app')}>Open ReelVault</button>
        </div>
      </div>
    );
  }

  return (
    <div className="connect-screen">
      <div className="connect-card">
        <div className="connect-icon">🔗</div>
        <h1 className="connect-title">Connect Telegram</h1>
        <p className="connect-sub">
          Connecting as <strong>{profile?.email}</strong>.<br />
          Tap the button below to link your Telegram account to ReelVault.
        </p>

        {status === 'error' && <p className="connect-error">{message}</p>}

        <button
          className="btn btn-primary"
          onClick={handleConnect}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Connecting…' : 'Connect my account'}
        </button>

        <button className="btn btn-ghost" onClick={() => navigate('/app')}>
          Cancel
        </button>
      </div>
    </div>
  );
}
