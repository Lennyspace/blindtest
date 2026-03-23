import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket.js';
import CircularTimer from '../components/CircularTimer.jsx';
import YoutubePlayer from '../components/YoutubePlayer.jsx';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Game({ code, roomState, gameData, roundResult, myAnswer }) {
  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const artistRef = useRef(null);
  const cooldown = useRef(false);

  const isHost = roomState?.hostId === socket.id;
  const players = [...(roomState?.players || [])].sort((a, b) => b.score - a.score);
  const roundIndex = gameData?.roundIndex ?? 0;
  const totalRounds = gameData?.total ?? roomState?.totalRounds ?? 10;
  const duration = gameData?.duration ?? 30;
  const isOver = !!roundResult;
  const fullyCorrect = myAnswer?.artistCorrect && myAnswer?.titleCorrect;

  useEffect(() => {
    setArtist(''); setTitle(''); setSubmitted(false);
    setNotifications([]);
    cooldown.current = false;
    setTimeout(() => artistRef.current?.focus(), 200);
  }, [gameData]);

  useEffect(() => {
    const handler = ({ name }) => {
      const id = Date.now();
      setNotifications(p => [...p.slice(-2), { id, text: `${name} a trouvé !` }]);
      setTimeout(() => setNotifications(p => p.filter(n => n.id !== id)), 2500);
    };
    socket.on('game:player-answered', handler);
    return () => socket.off('game:player-answered', handler);
  }, []);

  const submit = (e) => {
    e?.preventDefault();
    if (isOver || cooldown.current || fullyCorrect) return;
    if (!artist.trim() && !title.trim()) return;
    cooldown.current = true;
    setTimeout(() => { cooldown.current = false; }, 700);
    socket.emit('answer:submit', { code, artist: artist.trim(), title: title.trim() });
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(7,7,15,0.8)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
            {roundIndex + 1}<span style={{ color: 'var(--surface-3)', margin: '0 2px' }}>/</span>{totalRounds}
          </span>
          <div style={{ width: `${((roundIndex + 1) / totalRounds) * 100}%`, minWidth: '4px',
            height: '2px', background: 'var(--primary)', borderRadius: '2px',
            boxShadow: '0 0 6px var(--primary-glow)', transition: 'width 0.5s ease',
          }} />
        </div>

        {!isOver && <CircularTimer key={`${roundIndex}-${gameData?.videoId}`} duration={duration} />}

        {isOver && (
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {isHost ? '' : 'En attente de l\'hôte…'}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 220px',
        gap: '0',
        maxWidth: '900px', margin: '0 auto', width: '100%',
        padding: '24px 24px 32px',
        gap: '24px',
      }}>

        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Player / Reveal */}
          {!isOver ? (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px 24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              {gameData && (
                <YoutubePlayer
                  key={gameData.videoId}
                  videoId={gameData.videoId}
                  startSeconds={gameData.startSeconds}
                />
              )}
            </div>
          ) : (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px 24px',
              animation: 'slideUp 0.35s ease',
            }}>
              <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '14px', textTransform: 'uppercase' }}>
                Réponse
              </p>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                {roundResult.thumbnail && (
                  <img src={roundResult.thumbnail} alt="" style={{
                    width: '80px', height: '60px', objectFit: 'cover',
                    borderRadius: '8px', flexShrink: 0,
                  }} />
                )}
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, lineHeight: 1.2, marginBottom: '4px' }}>
                    {roundResult.title || '???'}
                  </div>
                  <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
                    {roundResult.artist}
                  </div>
                </div>
              </div>

              {myAnswer && (
                <div style={{
                  marginTop: '16px',
                  padding: '10px 14px',
                  background: myAnswer.points > 0 ? 'var(--success-dim)' : 'var(--surface-2)',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${myAnswer.points > 0 ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: '13px', color: myAnswer.points > 0 ? '#6ee7b7' : 'var(--text-muted)' }}>
                    {myAnswer.points > 0 ? 'Bien joué !' : 'Pas de point'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '16px', color: myAnswer.points > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                    {myAnswer.points > 0 ? `+${myAnswer.points}` : '—'}
                  </span>
                </div>
              )}

              {isHost ? (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '16px' }}
                  onClick={() => socket.emit('round:next', { code })}
                >
                  {roundIndex + 1 >= totalRounds ? 'Résultats finaux →' : 'Manche suivante →'}
                </button>
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '16px' }}>
                  En attente de l'hôte…
                </p>
              )}
            </div>
          )}

          {/* Answer form */}
          {!isOver && (
            <form onSubmit={submit} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              display: 'flex', flexDirection: 'column', gap: '12px',
            }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', letterSpacing: '0.1em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Artiste
                  </label>
                  <input
                    ref={artistRef}
                    className={myAnswer?.artistCorrect ? 'correct' : ''}
                    placeholder="Artiste…"
                    value={artist}
                    onChange={e => setArtist(e.target.value)}
                    disabled={myAnswer?.artistCorrect}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', letterSpacing: '0.1em', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Titre
                  </label>
                  <input
                    className={myAnswer?.titleCorrect ? 'correct' : ''}
                    placeholder="Titre…"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    disabled={myAnswer?.titleCorrect}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={fullyCorrect}
                >
                  {fullyCorrect ? '✓ Trouvé !' : submitted ? 'Corriger' : 'Envoyer'}
                </button>
                {myAnswer?.points > 0 && (
                  <span key={myAnswer.points} style={{
                    fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '18px',
                    color: 'var(--success)', animation: 'popIn 0.3s ease',
                  }}>
                    +{myAnswer.points}
                  </span>
                )}
              </div>

              {myAnswer?.artistCorrect && !myAnswer?.titleCorrect && (
                <p style={{ fontSize: '12px', color: '#6ee7b7' }}>✓ Artiste trouvé — cherche encore le titre</p>
              )}
              {myAnswer?.titleCorrect && !myAnswer?.artistCorrect && (
                <p style={{ fontSize: '12px', color: '#6ee7b7' }}>✓ Titre trouvé — cherche encore l'artiste</p>
              )}
            </form>
          )}
        </div>

        {/* Right: scoreboard */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          alignSelf: 'start',
        }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
            Classement
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {players.map((p, i) => {
              const isMe = p.id === socket.id;
              const delta = roundResult?.scores?.[p.id]?.roundScore;
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  background: isMe ? 'var(--primary-dim)' : 'transparent',
                  position: 'relative',
                }}>
                  <span style={{ fontSize: '13px', width: '18px', textAlign: 'center', flexShrink: 0 }}>
                    {i < 3 ? MEDALS[i] : i + 1}
                  </span>
                  <span style={{
                    flex: 1, fontSize: '13px',
                    color: isMe ? '#c4b5fd' : 'var(--text-dim)',
                    fontWeight: isMe ? 600 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {p.name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: isMe ? '#a78bfa' : 'var(--text-muted)', flexShrink: 0 }}>
                    {p.score.toLocaleString('fr-FR')}
                  </span>
                  {delta > 0 && (
                    <span key={`d-${p.id}-${delta}`} className="score-delta">+{delta}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div style={{
        position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center',
        pointerEvents: 'none', zIndex: 50,
      }}>
        {notifications.map(n => (
          <div key={n.id} style={{
            padding: '6px 14px',
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 'var(--radius-full)',
            color: '#6ee7b7', fontSize: '13px', fontWeight: 500,
            backdropFilter: 'blur(10px)',
            animation: 'popIn 0.2s ease',
          }}>
            {n.text}
          </div>
        ))}
      </div>
    </div>
  );
}
