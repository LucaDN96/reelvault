import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../services/api.js';
import { useLang } from '../contexts/LanguageContext.jsx';
import Header from '../components/Header.jsx';
import BottomNav from '../components/BottomNav.jsx';
import ReelCard from '../components/ReelCard.jsx';
import ReelModal from '../components/ReelModal.jsx';
import AddReelSheet from '../components/AddReelSheet.jsx';
import AddReelToCollectionSheet from '../components/AddReelToCollectionSheet.jsx';
import InviteMemberSheet from '../components/InviteMemberSheet.jsx';

export default function CollectionDetailScreen() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { t }    = useLang();
  const { profile } = useAuth();

  const [collection,    setCollection]    = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [selectedReel,  setSelectedReel]  = useState(null);
  const [showAddSheet,  setShowAddSheet]  = useState(false);
  const [showAddFromLib,setShowAddFromLib]= useState(false);
  const [showInvite,    setShowInvite]    = useState(false);
  const [showMembers,   setShowMembers]   = useState(false);
  const [renaming,      setRenaming]      = useState(false);
  const [newName,       setNewName]       = useState('');
  const [renameSaving,  setRenameSaving]  = useState(false);

  const isOwner = collection?.role === 'owner';
  const myId    = profile?.id;

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const data = await api.collections.get(id);
      setCollection(data);
    } catch (e) {
      setError(e.status === 403 ? 'Not a member of this collection.' : t('error_generic'));
    }
    setLoading(false);
  }

  async function handleRemoveReel(reelId) {
    try {
      await api.collections.removeReel(id, reelId);
      setCollection(prev => ({
        ...prev,
        reels: prev.reels.filter(r => r.id !== reelId)
      }));
      setSelectedReel(null);
    } catch (e) {
      alert(t('error_generic'));
    }
  }

  async function handleRemoveMember(uid) {
    const isSelf = uid === myId;
    const msg = isSelf ? t('collection_leave_confirm') : 'Remove this member?';
    if (!confirm(msg)) return;
    try {
      await api.collections.removeMember(id, uid);
      if (isSelf) {
        navigate('/app/collections');
      } else {
        setCollection(prev => ({
          ...prev,
          members: prev.members.filter(m => m.user_id !== uid)
        }));
      }
    } catch (e) {
      if (e.data?.error === 'owner_cannot_leave') alert(t('collection_owner_cannot_leave'));
      else alert(t('error_generic'));
    }
  }

  async function handleDelete() {
    if (!confirm(t('collection_delete_confirm'))) return;
    try {
      await api.collections.delete(id);
      navigate('/app/collections');
    } catch (e) {
      alert(t('error_generic'));
    }
  }

  async function handleRename() {
    if (!newName.trim()) return;
    setRenameSaving(true);
    try {
      const updated = await api.collections.rename(id, newName.trim());
      setCollection(prev => ({ ...prev, name: updated.name }));
      setRenaming(false);
    } catch (e) {
      alert(t('error_generic'));
    }
    setRenameSaving(false);
  }

  function handleReelAdded(reel) {
    setCollection(prev => ({
      ...prev,
      reels: [
        {
          collection_reel_id: '',
          added_by:           myId,
          added_by_email:     profile?.email || '',
          added_at:           new Date().toISOString(),
          ...reel
        },
        ...(prev.reels || [])
      ]
    }));
  }

  if (loading) return <div className="full-center">{t('loading')}</div>;
  if (error)   return (
    <div className="screen">
      <Header showBack />
      <div className="center-message">{error}</div>
    </div>
  );

  const reelIds = (collection.reels || []).map(r => r.id);

  return (
    <div className="screen">
      <Header showBack />

      {/* Collection header */}
      <div className="coll-detail-header">
        {renaming ? (
          <div className="coll-rename-row">
            <input
              className="input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRename()}
              autoFocus
              maxLength={60}
            />
            <button className="btn btn-primary btn-sm" onClick={handleRename} disabled={renameSaving || !newName.trim()}>
              {renameSaving ? '…' : t('collection_rename_save')}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setRenaming(false)}>✕</button>
          </div>
        ) : (
          <div className="coll-detail-title-row">
            <h1 className="coll-detail-title">{collection.name}</h1>
            <div className="coll-detail-actions">
              <button className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)}>
                {t('collection_invite')}
              </button>
              {isOwner && (
                <button className="icon-btn" onClick={() => { setNewName(collection.name); setRenaming(true); }} aria-label="Rename">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Member avatars */}
        <button className="coll-members-row" onClick={() => setShowMembers(v => !v)}>
          <div className="coll-avatar-stack">
            {(collection.members || []).slice(0, 3).map((m, i) => (
              <div key={m.user_id} className="coll-avatar" style={{ zIndex: 3 - i }}>
                {(m.email[0] || '?').toUpperCase()}
              </div>
            ))}
            {collection.members?.length > 3 && (
              <div className="coll-avatar coll-avatar-overflow">+{collection.members.length - 3}</div>
            )}
          </div>
          <span className="coll-members-label">
            {t('collection_members', { count: collection.members?.length || 0 })}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showMembers ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>

        {/* Members list (collapsible) */}
        {showMembers && (
          <div className="coll-members-list">
            {(collection.members || []).map(m => (
              <div key={m.user_id} className="coll-member-row">
                <div className="coll-avatar" style={{ fontSize: 12 }}>
                  {(m.email[0] || '?').toUpperCase()}
                </div>
                <span className="coll-member-email">{m.email}</span>
                {m.role === 'owner' && <span className="coll-role-badge">Owner</span>}
                {(isOwner && m.user_id !== myId) || (m.user_id === myId && m.role !== 'owner') ? (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginLeft: 'auto', fontSize: 12, padding: '4px 10px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    onClick={() => handleRemoveMember(m.user_id)}
                  >
                    {m.user_id === myId ? t('collection_leave') : t('collection_remove_member')}
                  </button>
                ) : null}
              </div>
            ))}
            {isOwner && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)', marginTop: 8 }}
                onClick={handleDelete}
              >
                {t('collection_delete')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reel list */}
      <div className="library-content">
        {collection.reels?.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎬</div>
            <p className="empty-sub">{t('collection_empty_reels')}</p>
            <button className="btn btn-primary" onClick={() => setShowAddFromLib(true)}>
              {t('collection_add_reel')}
            </button>
          </div>
        ) : (
          <div className="reel-list">
            {(collection.reels || []).map(reel => (
              <div key={reel.collection_reel_id || reel.id}>
                <ReelCard reel={reel} onClick={() => setSelectedReel(reel)} />
                <p className="coll-added-by">{t('collection_reel_added_by', { email: reel.added_by_email || '' })}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB to add reel from library */}
      {(collection.reels?.length > 0) && (
        <button
          className="add-fab"
          style={{ position: 'fixed', bottom: 'calc(76px + var(--safe-bottom))', right: 20, zIndex: 90 }}
          onClick={() => setShowAddFromLib(true)}
          aria-label="Add reel to collection"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      )}

      <BottomNav onAdd={() => setShowAddSheet(true)} />

      {selectedReel && (
        <ReelModal
          reel={selectedReel}
          onClose={() => setSelectedReel(null)}
          onDelete={() => handleRemoveReel(selectedReel.id)}
          onUpdate={() => {}}
        />
      )}

      {showAddSheet && (
        <AddReelSheet
          onClose={() => setShowAddSheet(false)}
          onSaved={() => {}}
        />
      )}

      {showAddFromLib && (
        <AddReelToCollectionSheet
          collectionId={id}
          existingReelIds={reelIds}
          onClose={() => setShowAddFromLib(false)}
          onAdded={handleReelAdded}
        />
      )}

      {showInvite && (
        <InviteMemberSheet
          collectionId={id}
          onClose={() => setShowInvite(false)}
          onInvited={() => load()}
        />
      )}
    </div>
  );
}
