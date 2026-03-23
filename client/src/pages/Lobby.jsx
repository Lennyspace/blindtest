import { useState, useEffect } from 'react';
import { socket } from '../socket.js';

const DEFAULT_THEMES = [
  { id: 'fr-2000s',    emoji: '🇫🇷', name: 'Hits français 2000-2010' },
  { id: 'hiphop-fr',  emoji: '🎤', name: 'Hip-hop FR' },
  { id: '80s',        emoji: '🕺', name: 'Années 80' },
  { id: 'rock-classic', emoji: '🎸', name: 'Rock classique' },
  { id: 'ost',        emoji: '🎬', name: 'Bandes originales' },
  { id: 'dance',      emoji: '💃', name: 'Club / Dance' },
  { id: 'pop-world',  emoji: '🌍', name: 'Hits internationaux' },
  { id: 'gaming',     emoji: '🎮', name: 'Jeux vidéo' },
];

export default function Lobby({ code, roomState, error, setError, onLeave }) {
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [customUrl, setCustomUrl] = useState('');
  const [roundCount, setRoundCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [copied, setCopied] = useState(false);

  const isHost = roomState?.hostId === socket.id;
  const players = roomState?.players || [];

  useEffect(() => {
    const onLoading   = () => setLoading(true);
    const onConfigured = () => { setLoading(false); setConfigured(true); };
    const onError     = () => setLoading(false);
    socket.on('room:loading',   onLoading);
    socket.on('room:configured', onConfigured);
    socket.on('room:error',     onError);
    return () => {
      socket.off('room:loading',   onLoading);
      socket.off('room:configured', onConfigured);
      socket.off('room:error',     onError);
    };
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfigure = (e) => {
    e.preventDefault();
    if (!selectedTheme && !customUrl.trim()) {
      return setError('Choisis un thème ou colle une URL YouTube');
    }
    setError(null);
    setConfigured(false);
    socket.emit('game:configure', {
      code,
      playlistId: selectedTheme && !customUrl.trim() ? selectedTheme : undefined,
      customUrl: customUrl.trim() || undefined,
      roundCount,
    });
  };

  const handleStart = () => {
    if (!configured) return setError('Configure la playlist d\'abord');
    socket.emit('game:start', { code });
  };

  return (
    <div className="page-top" style={{ paddingTop: '32px' }}>
      <div className="container-wide" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>Salle d'attente</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              {isHost ? 'Tu es l\'hôte de cette partie' : 'En attente du démarrage…'}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onLeave}>
            ✕ Quitter
          </button>
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
            animation: 'popIn 0.2s ease',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: '20px' }}>

          {/* Left: host config OR waiting */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {isHost ? (
              <form onSubmit={handleConfigure} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="card">
                  <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--text-dim)' }}>
                    Choisis un thème musical
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '10px',
                  }}>
                    {DEFAULT_THEMES.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => { setSelectedTheme(t.id); setCustomUrl(''); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius)',
                          background: selectedTheme === t.id && !customUrl ? 'var(--primary-dim)' : 'var(--surface-2)',
                          border: `1px solid ${selectedTheme === t.id && !customUrl ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`,
                          color: selectedTheme === t.id && !customUrl ? '#c4b5fd' : 'var(--text-dim)',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          fontSize: '13px',
                          fontWeight: 500,
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>{t.emoji}</span>
                        <span>{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ fontSize: '16px', marginBottom: '4px', color: 'var(--text-dim)' }}>
                    Ou ta propre playlist YouTube
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Colle l'URL d'une playlist publique YouTube
                  </p>
                  <input
                    type="url"
                    placeholder="https://youtube.com/playlist?list=..."
                    value={customUrl}
                    onChange={e => { setCustomUrl(e.target.value); setSelectedTheme(null); }}
                  />
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '14px', color: 'var(--text-dim)', fontWeight: 500 }}>
                      Nombre de manches
                    </label>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Entre 3 et 30</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setRoundCount(r => Math.max(3, r - 1))}
                      style={{ width: '32px', padding: '0', fontSize: '18px' }}
                    >−</button>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '24px',
                      fontWeight: 700,
                      minWidth: '40px',
                      textAlign: 'center',
                    }}>
                      {roundCount}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setRoundCount(r => Math.min(30, r + 1))}
                      style={{ width: '32px', padding: '0', fontSize: '18px' }}
                    >+</button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-secondary"
                  disabled={loading}
                  style={{ alignSelf: 'flex-start' }}
                >
                  {loading ? '⟳ Chargement…' : configured ? '✓ Playlist chargée — Reconfigurer' : 'Charger la playlist'}
                </button>

                {configured && (
                  <div style={{
                    padding: '12px 16px',
                    background: 'var(--success-dim)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: 'var(--radius)',
                    color: '#6ee7b7',
                    fontSize: '14px',
                    animation: 'popIn 0.2s ease',
                  }}>
                    ✓ Playlist prête ! Lance la partie quand tout le monde est là.
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={handleStart}
                  disabled={!configured || players.length < 1}
                >
                  ▶ Lancer la partie
                </button>
              </form>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'pulse-glow 2s infinite' }}>🎵</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
                  En attente que l'hôte configure et lance la partie…
                </p>
              </div>
            )}
          </div>

          {/* Right: room code + players */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Code */}
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Code de la salle
              </p>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '36px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#a78bfa',
                marginBottom: '12px',
              }}>
                {code}
              </div>
              <button
                className="btn btn-secondary btn-sm"
                style={{ width: '100%' }}
                onClick={handleCopyCode}
              >
                {copied ? '✓ Copié !' : '⎘ Copier'}
              </button>
            </div>

            {/* Players */}
            <div className="card" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '15px', color: 'var(--text-dim)' }}>Joueurs</h3>
                <span className="badge badge-primary">{players.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {players.map(p => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius)',
                      background: p.id === socket.id ? 'var(--primary-dim)' : 'var(--surface-2)',
                      border: `1px solid ${p.id === socket.id ? 'rgba(124,58,237,0.2)' : 'var(--border-soft)'}`,
                      animation: 'fadeIn 0.3s ease',
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>{p.isHost ? '👑' : '🎧'}</span>
                    <span style={{
                      flex: 1,
                      fontSize: '14px',
                      fontWeight: p.id === socket.id ? 600 : 400,
                      color: p.id === socket.id ? '#c4b5fd' : 'var(--text)',
                    }}>
                      {p.name}
                    </span>
                    {p.isHost && <span className="badge badge-accent">Host</span>}
                  </div>
                ))}
                {players.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '12px' }}>
                    En attente de joueurs…
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
