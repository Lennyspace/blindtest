import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket.js';
import CircularTimer from '../components/CircularTimer.jsx';
import YoutubePlayer from '../components/YoutubePlayer.jsx';
import Scoreboard from '../components/Scoreboard.jsx';

export default function Game({ code, roomState, gameData, roundResult, myAnswer }) {
  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [timerDone, setTimerDone] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const artistRef = useRef(null);
  const submitCooldown = useRef(false);

  const isHost = roomState?.hostId === socket.id;
  const players = roomState?.players || [];
  const roundIndex = gameData?.roundIndex ?? 0;
  const totalRounds = gameData?.total ?? roomState?.totalRounds ?? 10;
  const duration = gameData?.duration ?? 30;
  const isRoundOver = !!roundResult;

  // Focus artist input when round starts
  useEffect(() => {
    setArtist('');
    setTitle('');
    setSubmitted(false);
    setTimerDone(false);
    setNotifications([]);
    submitCooldown.current = false;
    setTimeout(() => artistRef.current?.focus(), 300);
  }, [gameData]);

  // Listen for player-answered events
  useEffect(() => {
    const handler = ({ name }) => {
      const notif = { id: Date.now(), text: `${name} a trouvé !` };
      setNotifications(prev => [...prev.slice(-3), notif]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notif.id));
      }, 3000);
    };
    socket.on('game:player-answered', handler);
    return () => socket.off('game:player-answered', handler);
  }, []);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (isRoundOver || submitCooldown.current) return;
    if (myAnswer?.artistCorrect && myAnswer?.titleCorrect) return;
    if (!artist.trim() && !title.trim()) return;
    submitCooldown.current = true;
    setTimeout(() => { submitCooldown.current = false; }, 800);
    socket.emit('answer:submit', { code, artist: artist.trim(), title: title.trim() });
    setSubmitted(true);
  };

  // Auto-submit on field change after short debounce (for fast players)
  const handleFieldChange = (setter, value) => {
    setter(value);
  };

  const artistStatus = myAnswer?.artistCorrect ? 'correct' : (submitted && !myAnswer?.artistCorrect && artist ? 'wrong' : '');
  const titleStatus = myAnswer?.titleCorrect ? 'correct' : (submitted && !myAnswer?.titleCorrect && title ? 'wrong' : '');

  return (
    <div className="page-top" style={{ paddingTop: '20px' }}>
      <div className="container-wide" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Header: round counter + timer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <div className="badge badge-primary" style={{ marginBottom: '6px' }}>
              Manche {roundIndex + 1} / {totalRounds}
            </div>
            <h2 style={{ fontSize: '22px' }}>
              {isRoundOver ? '🎤 Révélation' : '🎵 Qui joue ?'}
            </h2>
          </div>

          {!isRoundOver && (
            <CircularTimer
              key={`${roundIndex}-${gameData?.videoId}`}
              duration={duration}
              onEnd={() => setTimerDone(true)}
            />
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: '20px' }}>

          {/* Left: main game area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Player */}
            {!isRoundOver && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px' }}>
                {gameData && (
                  <YoutubePlayer
                    key={gameData.videoId}
                    videoId={gameData.videoId}
                    startSeconds={gameData.startSeconds}
                  />
                )}
              </div>
            )}

            {/* Answer form */}
            {!isRoundOver ? (
              <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h3 style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Ta réponse</h3>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', letterSpacing: '0.05em' }}>
                    ARTISTE
                  </label>
                  <input
                    ref={artistRef}
                    className={artistStatus}
                    placeholder="Artiste ou groupe…"
                    value={artist}
                    onChange={e => handleFieldChange(setArtist, e.target.value)}
                    disabled={myAnswer?.artistCorrect}
                    style={{ fontSize: '16px' }}
                  />
                  {myAnswer?.artistCorrect && (
                    <p style={{ fontSize: '12px', color: 'var(--success)', marginTop: '4px' }}>✓ Artiste correct ! +500</p>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', letterSpacing: '0.05em' }}>
                    TITRE
                  </label>
                  <input
                    className={titleStatus}
                    placeholder="Titre de la chanson…"
                    value={title}
                    onChange={e => handleFieldChange(setTitle, e.target.value)}
                    disabled={myAnswer?.titleCorrect}
                    style={{ fontSize: '16px' }}
                  />
                  {myAnswer?.titleCorrect && (
                    <p style={{ fontSize: '12px', color: 'var(--success)', marginTop: '4px' }}>✓ Titre correct ! +500</p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    disabled={myAnswer?.artistCorrect && myAnswer?.titleCorrect}
                  >
                    {myAnswer?.artistCorrect && myAnswer?.titleCorrect
                      ? '✓ Tout trouvé !'
                      : submitted ? 'Modifier la réponse' : 'Envoyer'}
                  </button>

                  {myAnswer?.points > 0 && (
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: 'var(--success)',
                      animation: 'popIn 0.3s ease',
                    }}>
                      +{myAnswer.points}
                    </div>
                  )}
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Tu peux envoyer artiste et titre séparément
                </p>
              </form>
            ) : (
              /* Reveal */
              <div className="card" style={{ animation: 'slideUp 0.4s ease' }}>
                <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '12px' }}>
                    LA RÉPONSE
                  </p>
                  {roundResult.thumbnail && (
                    <img
                      src={roundResult.thumbnail}
                      alt=""
                      style={{
                        width: '120px',
                        height: '90px',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius)',
                        marginBottom: '16px',
                        boxShadow: 'var(--shadow-md)',
                      }}
                    />
                  )}
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '28px',
                    fontWeight: 800,
                    marginBottom: '6px',
                    animation: 'popIn 0.4s ease',
                  }}>
                    {roundResult.title || '???'}
                  </div>
                  <div style={{
                    fontSize: '18px',
                    color: 'var(--text-muted)',
                    animation: 'popIn 0.4s ease 0.1s both',
                  }}>
                    {roundResult.artist || ''}
                  </div>

                  {/* My score this round */}
                  {myAnswer && (
                    <div style={{
                      marginTop: '20px',
                      padding: '14px',
                      background: myAnswer.points > 0 ? 'var(--success-dim)' : 'var(--surface-2)',
                      borderRadius: 'var(--radius)',
                      border: `1px solid ${myAnswer.points > 0 ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                      animation: 'popIn 0.4s ease 0.2s both',
                    }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '20px', color: myAnswer.points > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                        {myAnswer.points > 0 ? `+${myAnswer.points} pts` : 'Pas de point cette manche'}
                      </span>
                      <span style={{ marginLeft: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                        · Total : {(myAnswer.totalScore || 0).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  )}
                </div>

                {isHost && (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => socket.emit('round:next', { code })}
                  >
                    {roundIndex + 1 >= totalRounds ? 'Voir les résultats finaux →' : 'Manche suivante →'}
                  </button>
                )}
                {!isHost && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    En attente de l'hôte…
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: scoreboard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="card" style={{ flex: 1 }}>
              <h3 style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Classement
              </h3>
              <Scoreboard
                players={players}
                myId={socket.id}
                roundResult={isRoundOver ? roundResult : null}
                compact
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          alignItems: 'center',
          pointerEvents: 'none',
          zIndex: 100,
        }}>
          {notifications.map(n => (
            <div
              key={n.id}
              style={{
                padding: '8px 16px',
                background: 'var(--success-dim)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 'var(--radius-full)',
                color: '#6ee7b7',
                fontSize: '14px',
                fontWeight: 600,
                animation: 'popIn 0.2s ease',
                backdropFilter: 'blur(10px)',
              }}
            >
              {n.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
