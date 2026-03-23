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

const DURATIONS = [15, 20, 30, 45, 60];

export default function Lobby({ code, roomState, error, setError, onLeave }) {
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [customUrl, setCustomUrl] = useState('');
  const [roundCount, setRoundCount] = useState(10);
  const [duration, setDuration] = useState(30);
  const [hints, setHints] = useState(true);
  const [autoNext, setAutoNext] = useState(8);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [trackCount, setTrackCount] = useState(null);
  const [copied, setCopied] = useState(false);

  const isHost = roomState?.hostId === socket.id;
  const players = roomState?.players || [];

  useEffect(() => {
    const onLoading    = () => setLoading(true);
    const onConfigured = ({ trackCount, playlistName }) => {
      setLoading(false); setConfigured(true); setTrackCount(trackCount);
    };
    const onError = () => setLoading(false);
    socket.on('room:loading',    onLoading);
    socket.on('room:configured', onConfigured);
    socket.on('room:error',      onError);
    return () => {
      socket.off('room:loading',    onLoading);
      socket.off('room:configured', onConfigured);
      socket.off('room:error',      onError);
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfigure = (e) => {
    e.preventDefault();
    if (!selectedTheme && !customUrl.trim()) return setError('Choisis un thème ou colle une URL YouTube');
    setError(null); setConfigured(false);
    socket.emit('game:configure', {
      code,
      playlistId: selectedTheme && !customUrl.trim() ? selectedTheme : undefined,
      customUrl: customUrl.trim() || undefined,
      roundCount,
      duration,
      hints,
      autoNext,
    });
  };

  const handleStart = () => {
    if (!configured) return setError('Configure la playlist d\'abord');
    socket.emit('game:start', { code });
  };

  // Config display for guests
  const configInfo = roomState?.config;
  const playlistName = roomState?.playlistName;

  return (
    <div className="page-top" style={{ paddingTop: '28px' }}>
      <div className="container-wide" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', marginBottom: '2px' }}>Salle d'attente</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              {isHost ? 'Tu es l\'hôte' : 'En attente du démarrage…'}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onLeave}>✕ Quitter</button>
        </div>

        {error && (
          <div style={{
            background: 'var(--error-dim)', border: '1px solid rgba(244,63,94,0.3)',
            borderRadius: 'var(--radius)', padding: '10px 14px', color: '#fda4af', fontSize: '13px',
            animation: 'popIn 0.2s ease',
          }}>{error}</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: '16px' }}>

          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {isHost ? (
              <form onSubmit={handleConfigure} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* Themes */}
                <div className="card">
                  <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Thème musical
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: '8px' }}>
                    {DEFAULT_THEMES.map(t => (
                      <button key={t.id} type="button"
                        onClick={() => { setSelectedTheme(t.id); setCustomUrl(''); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '9px 12px', borderRadius: 'var(--radius)',
                          background: selectedTheme === t.id && !customUrl ? 'var(--primary-dim)' : 'var(--surface-2)',
                          border: `1px solid ${selectedTheme === t.id && !customUrl ? 'rgba(124,58,237,0.35)' : 'var(--border)'}`,
                          color: selectedTheme === t.id && !customUrl ? '#c4b5fd' : 'var(--text-dim)',
                          cursor: 'pointer', transition: 'all 0.15s',
                          fontSize: '13px', fontWeight: 500, textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>{t.emoji}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                      </button>
                    ))}
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Ou URL playlist YouTube
                    </label>
                    <input
                      type="url" placeholder="https://youtube.com/playlist?list=... ou https://deezer.com/playlist/..."
                      value={customUrl}
                      onChange={e => { setCustomUrl(e.target.value); setSelectedTheme(null); }}
                    />
                  </div>
                </div>

                {/* Settings */}
                <div className="card" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {/* Rounds */}
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Manches
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button type="button" className="btn btn-secondary btn-sm"
                        onClick={() => setRoundCount(r => Math.max(3, r - 1))}
                        style={{ width: '30px', padding: 0, fontSize: '16px' }}>−</button>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 700, minWidth: '36px', textAlign: 'center' }}>
                        {roundCount}
                      </span>
                      <button type="button" className="btn btn-secondary btn-sm"
                        onClick={() => setRoundCount(r => Math.min(30, r + 1))}
                        style={{ width: '30px', padding: 0, fontSize: '16px' }}>+</button>
                    </div>
                  </div>

                  {/* Duration */}
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Durée par manche
                    </p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {DURATIONS.map(d => (
                        <button key={d} type="button"
                          onClick={() => setDuration(d)}
                          style={{
                            padding: '5px 12px', borderRadius: 'var(--radius)',
                            background: duration === d ? 'var(--primary-dim)' : 'var(--surface-2)',
                            border: `1px solid ${duration === d ? 'rgba(124,58,237,0.35)' : 'var(--border)'}`,
                            color: duration === d ? '#c4b5fd' : 'var(--text-muted)',
                            cursor: 'pointer', fontSize: '13px', fontWeight: duration === d ? 600 : 400,
                            transition: 'all 0.15s',
                          }}
                        >
                          {d}s
                        </button>
                      ))}
                    </div>
                    </div>

                  {/* Hints toggle */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '2px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Options
                    </p>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                      <div onClick={() => setHints(h => !h)} style={{
                        width: '36px', height: '20px', borderRadius: '10px', flexShrink: 0,
                        background: hints ? 'var(--primary)' : 'var(--surface-3)',
                        border: `1px solid ${hints ? 'rgba(124,58,237,0.5)' : 'var(--border)'}`,
                        position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                      }}>
                        <div style={{
                          position: 'absolute', top: '2px',
                          left: hints ? '18px' : '2px',
                          width: '14px', height: '14px', borderRadius: '50%',
                          background: 'white', transition: 'left 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        }}/>
                      </div>
                      <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>💡 Indices à 15s</span>
                    </label>
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>⏭ Prochaine manche après</p>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {[5, 8, 12, 20].map(s => (
                          <button key={s} type="button"
                            onClick={() => setAutoNext(s)}
                            style={{
                              padding: '4px 10px', borderRadius: 'var(--radius)',
                              background: autoNext === s ? 'var(--primary-dim)' : 'var(--surface-2)',
                              border: `1px solid ${autoNext === s ? 'rgba(124,58,237,0.35)' : 'var(--border)'}`,
                              color: autoNext === s ? '#c4b5fd' : 'var(--text-muted)',
                              cursor: 'pointer', fontSize: '12px', fontWeight: autoNext === s ? 600 : 400,
                              transition: 'all 0.15s',
                            }}
                          >{s}s</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn btn-secondary" disabled={loading}>
                    {loading ? '⟳ Chargement…' : configured ? `✓ ${trackCount} titres — Rechanger` : 'Charger la playlist'}
                  </button>
                  {configured && (
                    <button type="button" className="btn btn-primary btn-lg" onClick={handleStart}>
                      ▶ Lancer
                    </button>
                  )}
                </div>

                {configured && (
                  <div style={{
                    padding: '10px 14px', background: 'var(--success-dim)',
                    border: '1px solid rgba(16,185,129,0.25)', borderRadius: 'var(--radius)',
                    color: '#6ee7b7', fontSize: '13px', animation: 'popIn 0.2s ease',
                  }}>
                    ✓ {trackCount} titres chargés{playlistName ? ` — ${playlistName}` : ''}
                  </div>
                )}
              </form>
            ) : (
              /* Guest view */
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Paramètres de la partie
                </h3>
                {configInfo && (
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Manches</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700 }}>{configInfo.roundCount}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Durée</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700 }}>{configInfo.duration}s</p>
                    </div>
                    {playlistName && (
                      <div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Playlist</p>
                        <p style={{ fontSize: '14px', fontWeight: 500 }}>{playlistName}</p>
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Indices</p>
                      <p style={{ fontSize: '14px', fontWeight: 500 }}>{configInfo.hints ? '💡 Oui' : '—'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Prochaine manche</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700 }}>{configInfo.autoNext ?? 8}s</p>
                    </div>
                  </div>
                )}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '32px', gap: '12px', color: 'var(--text-muted)', fontSize: '14px',
                }}>
                  <span style={{ animation: 'pulse-glow 2s infinite', fontSize: '24px' }}>🎵</span>
                  En attente que l'hôte lance la partie…
                </div>
              </div>
            )}
          </div>

          {/* Right */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Code */}
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Code
              </p>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '32px', fontWeight: 700,
                letterSpacing: '0.12em', color: '#a78bfa', marginBottom: '10px',
              }}>
                {code}
              </div>
              <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={handleCopy}>
                {copied ? '✓ Copié !' : '⎘ Copier'}
              </button>
            </div>

            {/* Players */}
            <div className="card" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Joueurs</p>
                <span className="badge badge-primary">{players.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {players.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 10px', borderRadius: 'var(--radius)',
                    background: p.id === socket.id ? 'var(--primary-dim)' : 'var(--surface-2)',
                    border: `1px solid ${p.id === socket.id ? 'rgba(124,58,237,0.2)' : 'var(--border-soft)'}`,
                    animation: 'fadeIn 0.3s ease',
                  }}>
                    <span style={{ fontSize: '13px' }}>{p.isHost ? '👑' : '🎧'}</span>
                    <span style={{
                      flex: 1, fontSize: '13px',
                      fontWeight: p.id === socket.id ? 600 : 400,
                      color: p.id === socket.id ? '#c4b5fd' : 'var(--text)',
                    }}>{p.name}</span>
                    {p.isHost && <span className="badge badge-accent">Host</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
