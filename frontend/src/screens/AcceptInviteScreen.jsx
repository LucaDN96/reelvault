import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useLang } from '../contexts/LanguageContext.jsx';

export default function AcceptInviteScreen() {
  const { t }     = useLang();
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const token     = params.get('token');

  const [status, setStatus] = useState('loading'); // loading | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setErrorMsg(t('invite_not_found'));
      setStatus('error');
      return;
    }
    api.collections.acceptInvite(token)
      .then(({ collection_id }) => {
        navigate(`/app/collections/${collection_id}`, { replace: true });
      })
      .catch(e => {
        if (e.status === 410) setErrorMsg(t('invite_expired'));
        else if (e.status === 404) setErrorMsg(t('invite_not_found'));
        else setErrorMsg(t('error_generic'));
        setStatus('error');
      });
  }, [token]);

  if (status === 'loading') {
    return <div className="full-center">{t('invite_accepting')}</div>;
  }

  return (
    <div className="full-center" style={{ flexDirection: 'column', gap: 16, padding: 24, textAlign: 'center' }}>
      <span style={{ fontSize: 48 }}>🔗</span>
      <p style={{ color: 'var(--text)', fontWeight: 700, fontSize: 17 }}>{errorMsg}</p>
      <button className="btn btn-primary" onClick={() => navigate('/app/collections')}>
        Go to Collections
      </button>
    </div>
  );
}
