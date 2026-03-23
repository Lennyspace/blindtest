import { useState } from 'react';
import { socket } from '../socket.js';

export default function Home({ error, setError }) {
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    const name = nickname.trim();
    if (!name) return setError('Entre un pseudo');
    setError(null);
    socket.emit('room:create', { nickname: name });
  };

  const handleJoin = (e) => {
    e.preventDefault();
    const name = nickname.trim();
    const c = code.trim().toUpperCase();
    if (!name) return setError('Entre un pseudo');
    if (c.length !== 6) return setError('Le code fait 6 caractères');
    setError(null);
    socket.emit('room:join', { code: c, nickname: name });
  };

  return (
    <div className="page">
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '48px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', animation: 'slideUp 0.5s ease' }}>
          <div style={{
            fontSize: '56px',
            marginBottom: '8px',
            filter: 'drop-shadow(0 0 20px rgba(124,58,237,0.5))',
          }}>🎵</div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(48px, 10vw, 80px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #f0f0fa 30%, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1,
          }}>
            BLINDTEST
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '12px', fontSize: '16px' }}>
            Le quiz musical multijoueur
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'var(--error-dim)',
            border: '1px solid rgba(244,63,94,0.3)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            color: '#fda4af',
            fontSize: '14px',
            width: '100%',
            textAlign: 'center',
            animation: 'popIn 0.2s ease',
          }}>
            {error}
          </div>
        )}

        {/* Main actions */}
        {!mode && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            width: '100%',
            animation: 'fadeIn 0.5s ease 0.1s both',
          }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => { setMode('create'); setError(null); }}
              style={{ flexDirection: 'column', gap: '8px', padding: '28px 20px', borderRadius: 'var(--radius-lg)' }}
            >
              <span style={{ fontSize: '28px' }}>✦</span>
              <span>Créer une partie</span>
            </button>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => { setMode('join'); setError(null); }}
              style={{ flexDirection: 'column', gap: '8px', padding: '28px 20px', borderRadius: 'var(--radius-lg)' }}
            >
              <span style={{ fontSize: '28px' }}>→</span>
              <span>Rejoindre</span>
            </button>
          </div>
        )}

        {/* Create form */}
        {mode === 'create' && (
          <form
            onSubmit={handleCreate}
            style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.3s ease' }}
          >
            <h2 style={{ fontSize: '22px', marginBottom: '4px' }}>Nouvelle partie</h2>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                Ton pseudo
              </label>
              <input
                autoFocus
                placeholder="Ex: CaptainQuiz"
                maxLength={20}
                value={nickname}
                onChange={e => setNickname(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => { setMode(null); setError(null); }}>
                ← Retour
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Créer la salle
              </button>
            </div>
          </form>
        )}

        {/* Join form */}
        {mode === 'join' && (
          <form
            onSubmit={handleJoin}
            style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.3s ease' }}
          >
            <h2 style={{ fontSize: '22px', marginBottom: '4px' }}>Rejoindre</h2>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                Code de la salle
              </label>
              <input
                autoFocus
                placeholder="XXXXXX"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', textAlign: 'center', letterSpacing: '0.15em' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                Ton pseudo
              </label>
              <input
                placeholder="Ex: MusicMaster"
                maxLength={20}
                value={nickname}
                onChange={e => setNickname(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => { setMode(null); setError(null); }}>
                ← Retour
              </button>
              <button type="submit" className="btn btn-accent" style={{ flex: 1 }}>
                Rejoindre →
              </button>
            </div>
          </form>
        )}

        {/* Footer note */}
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', opacity: 0.6 }}>
          Aucun compte requis · Audio via YouTube
        </p>
      </div>
    </div>
  );
}
