import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { socket } from '../socket.js';
import CircularTimer from '../components/CircularTimer.jsx';
import AudioPlayer from '../components/AudioPlayer.jsx';

const MEDALS = ['🥇', '🥈', '🥉'];

function formatMs(ms) {
  if (ms == null) return '—';
  const s = (ms / 1000).toFixed(1);
  return `${s}s`;
}

export default function Game({ code, roomState, gameData, roundResult, myAnswer }) {
  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const [playerStatuses, setPlayerStatuses] = useState({});
  const [autoNext, setAutoNext] = useState(null);
  const [countdown, setCountdown] = useState(null); // 3-2-1 overlay
  const [hint, setHint] = useState(null); // { artistHint, titleHint }
  const [artistShake, setArtistShake] = useState(false);
  const [titleShake, setTitleShake] = useState(false);
  const artistRef = useRef(null);
  const cooldown = useRef(false);
  const autoNextRef = useRef(null);
  const prevAnswer = useRef(null);

  const isHost = roomState?.hostId === socket.id;
  const players = [...(roomState?.players || [])].sort((a, b) => b.score - a.score);
  const roundIndex = gameData?.roundIndex ?? 0;
  const totalRounds = gameData?.total ?? roomState?.totalRounds ?? 10;
  const duration = gameData?.duration ?? 30;
  const playlistName = gameData?.playlistName || roomState?.playlistName || '';
  const isOver = !!roundResult;
  const fullyCorrect = myAnswer?.artistCorrect && myAnswer?.titleCorrect;

  // Reset on new round + 3-2-1 countdown
  useEffect(() => {
    if (!gameData) return;
    setArtist(''); setTitle('');
    setPlayerStatuses({});
    setAutoNext(null);
    setHint(null);
    clearInterval(autoNextRef.current);
    cooldown.current = false;
    prevAnswer.current = null;

    // 3-2-1 countdown
    setCountdown(3);
    let n = 3;
    const iv = setInterval(() => {
      n -= 1;
      if (n <= 0) { clearInterval(iv); setCountdown(null); setTimeout(() => artistRef.current?.focus(), 50); }
      else setCountdown(n);
    }, 1000);
    return () => clearInterval(iv);
  }, [gameData]);

  // Auto-next countdown display
  useEffect(() => {
    if (!roundResult?.autoNextIn) return;
    let secs = roundResult.autoNextIn;
    setAutoNext(secs);
    autoNextRef.current = setInterval(() => {
      secs -= 1;
      setAutoNext(secs);
      if (secs <= 0) clearInterval(autoNextRef.current);
    }, 1000);
    return () => clearInterval(autoNextRef.current);
  }, [roundResult]);

  // Player statuses
  useEffect(() => {
    const handler = (statuses) => setPlayerStatuses(statuses);
    socket.on('game:player-statuses', handler);
    return () => socket.off('game:player-statuses', handler);
  }, []);

  // Hint
  useEffect(() => {
    const handler = (h) => setHint(h);
    socket.on('game:hint', handler);
    return () => socket.off('game:hint', handler);
  }, []);

  // Pending submission ref: what artist/title the user just submitted
  const pendingRef = useRef({ artist: '', title: '' });

  // Handle answer result: confetti on correct, shake on wrong
  useEffect(() => {
    if (!myAnswer) return;
    const prev = prevAnswer.current || {};
    const newArtist = myAnswer.artistCorrect && !prev.artistCorrect;
    const newTitle = myAnswer.titleCorrect && !prev.titleCorrect;

    if (newArtist || newTitle) {
      confetti({ particleCount: myAnswer.artistCorrect && myAnswer.titleCorrect ? 120 : 60,
        spread: 70, origin: { y: 0.7 }, colors: ['#8b5cf6','#6ee7b7','#67e8f9','#fbbf24'] });
    }

    // Shake wrong fields (only if we just submitted something for them)
    if (!myAnswer.artistCorrect && pendingRef.current.artist) {
      setArtistShake(true);
      setTimeout(() => { setArtistShake(false); setArtist(''); }, 500);
    }
    if (!myAnswer.titleCorrect && pendingRef.current.title) {
      setTitleShake(true);
      setTimeout(() => { setTitleShake(false); setTitle(''); }, 500);
    }
    pendingRef.current = { artist: '', title: '' };
    prevAnswer.current = myAnswer;
  }, [myAnswer]);

  const submit = (e) => {
    e?.preventDefault();
    if (isOver || cooldown.current || fullyCorrect) return;
    if (!artist.trim() && !title.trim()) return;
    cooldown.current = true;
    setTimeout(() => { cooldown.current = false; }, 700);
    // Track what we're submitting so we can detect wrong answer
    pendingRef.current = {
      artist: !myAnswer?.artistCorrect ? artist.trim() : '',
      title: !myAnswer?.titleCorrect ? title.trim() : '',
    };
    socket.emit('answer:submit', { code, artist: artist.trim(), title: title.trim() });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* 3-2-1 overlay */}
      {countdown !== null && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(7,7,15,0.85)', backdropFilter: 'blur(8px)',
          pointerEvents: 'none',
        }}>
          <span key={countdown} style={{
            fontFamily: 'var(--font-display)', fontSize: '120px', fontWeight: 900,
            color: 'var(--primary)', textShadow: '0 0 40px var(--primary-glow)',
            animation: 'popIn 0.4s ease',
          }}>
            {countdown}
          </span>
        </div>
      )}

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '12px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(7,7,15,0.9)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {playlistName && (
          <span style={{
            fontSize: '12px', color: 'var(--text-muted)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: '180px',
          }}>
            🎵 {playlistName}
          </span>
        )}

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            flex: 1, height: '3px',
            background: 'var(--surface-3)', borderRadius: '2px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${((roundIndex + 1) / totalRounds) * 100}%`,
              background: 'var(--primary)',
              boxShadow: '0 0 8px var(--primary-glow)',
              borderRadius: '2px',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
            {roundIndex + 1}/{totalRounds}
          </span>
        </div>

        {!isOver && (
          <CircularTimer
            key={`${roundIndex}-${gameData?.videoId}`}
            duration={duration}
          />
        )}
        {isOver && isHost && (
          <button className="btn btn-primary btn-sm" onClick={() => socket.emit('round:next', { code })}>
            {roundIndex + 1 >= totalRounds ? 'Résultats →' : 'Suivante →'}
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 210px',
        gap: '16px',
        maxWidth: '860px', margin: '0 auto', width: '100%',
        padding: '20px 20px 32px',
      }}>

        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Player */}
          {!isOver && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
              {gameData && (
                <AudioPlayer
                  key={gameData.videoId || gameData.previewUrl}
                  source={gameData.source || 'youtube'}
                  videoId={gameData.videoId}
                  previewUrl={gameData.previewUrl}
                  startSeconds={gameData.startSeconds}
                />
              )}
            </div>
          )}

          {/* Reveal */}
          {isOver && (
            <div className="card" style={{ animation: 'slideUp 0.3s ease' }}>
              <p style={{ fontSize: '10px', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
                Réponse
              </p>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                {roundResult.thumbnail && (
                  <img src={roundResult.thumbnail} alt="" style={{
                    width: '72px', height: '54px', objectFit: 'cover',
                    borderRadius: '8px', flexShrink: 0,
                  }} />
                )}
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, lineHeight: 1.2, marginBottom: '3px' }}>
                    {roundResult.title}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{roundResult.artist}</div>
                </div>
              </div>
              {myAnswer && (
                <div style={{
                  marginTop: '14px', padding: '9px 12px',
                  background: myAnswer.points > 0 ? 'var(--success-dim)' : 'var(--surface-2)',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${myAnswer.points > 0 ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '13px', color: myAnswer.points > 0 ? '#6ee7b7' : 'var(--text-muted)' }}>
                    {myAnswer.points > 0 ? 'Bien joué !' : 'Pas de point cette manche'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: myAnswer.points > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                    {myAnswer.points > 0 ? `+${myAnswer.points}` : '—'}
                  </span>
                </div>
              )}

              {/* Round stats */}
              {roundResult.stats && (
                <div style={{ marginTop: '14px' }}>
                  <p style={{ fontSize: '10px', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Stats de la manche
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {players.map(p => {
                      const st = roundResult.stats[p.id];
                      if (!st) return null;
                      const isMe = p.id === socket.id;
                      return (
                        <div key={p.id} style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '5px 8px', borderRadius: '6px',
                          background: isMe ? 'var(--primary-dim)' : 'var(--surface-2)',
                          fontSize: '12px',
                        }}>
                          <span style={{ flex: 1, color: isMe ? '#c4b5fd' : 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name}
                          </span>
                          <span style={{ color: st.artistCorrect ? '#6ee7b7' : 'var(--text-muted)' }}>A{st.artistCorrect ? '✓' : '✗'}</span>
                          <span style={{ color: st.titleCorrect ? '#67e8f9' : 'var(--text-muted)' }}>T{st.titleCorrect ? '✓' : '✗'}</span>
                          {st.finishTime != null && (
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '11px' }}>
                              {formatMs(st.finishTime)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isHost ? (
                <button className="btn btn-secondary btn-sm" style={{ width:'100%', marginTop:'10px' }}
                  onClick={() => { clearInterval(autoNextRef.current); socket.emit('round:next', { code }); }}>
                  Passer maintenant →
                </button>
              ) : (
                <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'12px', marginTop:'12px' }}>
                  {autoNext > 0 ? `Prochaine manche dans ${autoNext}s…` : 'Chargement…'}
                </p>
              )}
            </div>
          )}

          {/* Answer form */}
          {!isOver && (
            <form onSubmit={submit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Live partial reveals */}
              {myAnswer?.artistCorrect && myAnswer?.canonicalArtist && (
                <div style={{
                  padding: '8px 12px', background: 'var(--success-dim)',
                  border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius)',
                  fontSize: '13px', color: '#6ee7b7', display: 'flex', gap: '8px',
                  animation: 'popIn 0.3s ease',
                }}>
                  ✓ Artiste : <strong>{myAnswer.canonicalArtist}</strong>
                </div>
              )}
              {myAnswer?.titleCorrect && myAnswer?.canonicalTitle && (
                <div style={{
                  padding: '8px 12px', background: 'var(--success-dim)',
                  border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius)',
                  fontSize: '13px', color: '#6ee7b7', display: 'flex', gap: '8px',
                  animation: 'popIn 0.3s ease',
                }}>
                  ✓ Titre : <strong>{myAnswer.canonicalTitle}</strong>
                </div>
              )}

              {/* Hint */}
              {hint && (
                <div style={{
                  padding: '7px 12px', background: 'rgba(251,191,36,0.1)',
                  border: '1px solid rgba(251,191,36,0.25)', borderRadius: 'var(--radius)',
                  fontSize: '12px', color: '#fbbf24', display: 'flex', gap: '12px',
                  animation: 'slideUp 0.3s ease',
                }}>
                  💡 Indice —
                  {!myAnswer?.artistCorrect && <span>Artiste : <strong>{hint.artistHint}…</strong></span>}
                  {!myAnswer?.titleCorrect && <span>Titre : <strong>{hint.titleHint}…</strong></span>}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', letterSpacing: '0.1em', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Artiste
                  </label>
                  <input
                    ref={artistRef}
                    className={myAnswer?.artistCorrect ? 'correct' : artistShake ? 'shake-wrong' : ''}
                    placeholder="Artiste…"
                    value={myAnswer?.artistCorrect ? (myAnswer.canonicalArtist || artist) : artist}
                    onChange={e => setArtist(e.target.value)}
                    disabled={myAnswer?.artistCorrect}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', letterSpacing: '0.1em', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Titre
                  </label>
                  <input
                    className={myAnswer?.titleCorrect ? 'correct' : titleShake ? 'shake-wrong' : ''}
                    placeholder="Titre…"
                    value={myAnswer?.titleCorrect ? (myAnswer.canonicalTitle || title) : title}
                    onChange={e => setTitle(e.target.value)}
                    disabled={myAnswer?.titleCorrect}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={fullyCorrect}>
                  {fullyCorrect ? '✓ Tout trouvé !' : 'Envoyer'}
                </button>
                {myAnswer?.points > 0 && (
                  <span key={myAnswer.totalScore} style={{
                    fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '18px',
                    color: 'var(--success)', animation: 'popIn 0.3s ease', flexShrink: 0,
                  }}>
                    +{myAnswer.points}
                  </span>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Scoreboard */}
        <div className="card" style={{ alignSelf: 'start', padding: '14px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>
            Classement
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {players.map((p, i) => {
              const isMe = p.id === socket.id;
              const st = playerStatuses[p.id] || {};
              const delta = isOver && roundResult?.scores?.[p.id]?.roundScore;
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 8px', borderRadius: '8px',
                  background: isMe ? 'var(--primary-dim)' : 'transparent',
                  position: 'relative',
                }}>
                  <span style={{ fontSize: '12px', width: '16px', textAlign: 'center', flexShrink: 0 }}>
                    {i < 3 ? MEDALS[i] : i + 1}
                  </span>
                  <span style={{
                    flex: 1, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: isMe ? '#c4b5fd' : 'var(--text-dim)', fontWeight: isMe ? 600 : 400,
                  }}>
                    {p.name}
                  </span>
                  <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                    {st.artistCorrect && (
                      <span title="Artiste trouvé" style={{
                        fontSize: '9px', padding: '1px 4px', borderRadius: '4px',
                        background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', fontWeight: 700,
                      }}>A✓</span>
                    )}
                    {st.titleCorrect && (
                      <span title="Titre trouvé" style={{
                        fontSize: '9px', padding: '1px 4px', borderRadius: '4px',
                        background: 'rgba(6,182,212,0.2)', color: '#67e8f9', fontWeight: 700,
                      }}>T✓</span>
                    )}
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '11px',
                    color: isMe ? '#a78bfa' : 'var(--text-muted)', flexShrink: 0,
                  }}>
                    {p.score.toLocaleString('fr-FR')}
                  </span>
                  {delta > 0 && <span key={`d-${p.id}-${delta}`} className="score-delta">+{delta}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
