import { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useLang } from '../contexts/LanguageContext.jsx';

export default function InviteMemberSheet({ collectionId, onClose, onInvited }) {
  const { t } = useLang();
  const [email,  setEmail]  = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error,   setError]   = useState('');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleInvite() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setSending(true);
    setError('');
    setSuccess('');
    try {
      await api.collections.invite(collectionId, trimmed);
      setSuccess(t('collection_invite_sent', { email: trimmed }));
      setEmail('');
      onInvited?.();
    } catch (e) {
      if (e.status === 409) setError(t('collection_invite_already_member'));
      else if (e.status === 403 && e.data?.error === 'member_limit') setError(t('collection_invite_member_limit'));
      else setError(e.message || t('error_generic'));
    }
    setSending(false);
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-sheet add-reel-sheet" role="dialog" aria-modal="true">
        <div className="modal-handle" />
        <div className="add-reel-body">
          <p className="add-reel-title">{t('collection_invite')}</p>
          <input
            className="input"
            type="email"
            inputMode="email"
            placeholder={t('collection_invite_placeholder')}
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); setSuccess(''); }}
            onKeyDown={e => e.key === 'Enter' && !sending && handleInvite()}
            autoFocus
          />
          {error   && <p className="add-reel-error">{error}</p>}
          {success && <p style={{ fontSize: 13, color: 'var(--success)' }}>{success}</p>}
          <button
            className="btn btn-primary"
            onClick={handleInvite}
            disabled={sending || !email.trim()}
          >
            {sending ? '…' : t('collection_invite_send')}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            {t('delete_confirm_no')}
          </button>
        </div>
      </div>
    </div>
  );
}
