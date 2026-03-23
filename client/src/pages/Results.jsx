import { socket } from '../socket.js';

const MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_COLORS = ['#f59e0b', '#94a3b8', '#b45309'];
const PODIUM_HEIGHTS = ['160px', '120px', '90px'];

export default function Results({ finalScores, roomState, onPlayAgain }) {
  const scores = finalScores || roomState?.players?.sort((a, b) => b.score - a.score) || [];
  const top3 = scores.slice(0, 3);
  const rest = scores.slice(3);
  const isHost = roomState?.hostId === socket.id;

  // Reorder for podium: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div className="page" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px' }}>

        {/* Title */}
        <div style={{ textAlign: 'center', animation: 'slideUp 0.5s ease' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏆</div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 8vw, 56px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #f0f0fa 30%, #fbbf24)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Résultats
          </h1>
        </div>

        {/* Podium */}
        {top3.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            animation: 'fadeIn 0.6s ease 0.2s both',
          }}>
            {podiumOrder.map((p, visualIdx) => {
              const rank = scores.indexOf(p); // 0-indexed real rank
              const isMe = p.id === socket.id;
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: visualIdx === 1 ? '1.2' : '1',
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '6px', animation: `popIn 0.4s ease ${0.3 + visualIdx * 0.1}s both` }}>
                    {MEDALS[rank]}
                  </div>
                  <div style={{
                    fontWeight: 600,
                    fontSize: visualIdx === 1 ? '16px' : '14px',
                    color: isMe ? '#c4b5fd' : 'var(--text)',
                    marginBottom: '4px',
                    textAlign: 'center',
                  }}>
                    {p.name}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '14px',
                    color: PODIUM_COLORS[rank],
                    marginBottom: '8px',
                    fontWeight: 700,
                  }}>
                    {p.score.toLocaleString('fr-FR')} pts
                  </div>
                  <div style={{
                    width: '100%',
                    height: PODIUM_HEIGHTS[rank],
                    background: `linear-gradient(to top, ${PODIUM_COLORS[rank]}22, ${PODIUM_COLORS[rank]}08)`,
                    border: `1px solid ${PODIUM_COLORS[rank]}44`,
                    borderBottom: 'none',
                    borderRadius: 'var(--radius) var(--radius) 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    animation: `slideUp 0.5s ease ${0.4 + visualIdx * 0.1}s both`,
                  }}>
                    {rank === 0 ? '👑' : rank === 1 ? '⭐' : '✦'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rest of leaderboard */}
        {rest.length > 0 && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', animation: 'fadeIn 0.5s ease 0.5s both' }}>
            {rest.map((p, i) => {
              const rank = i + 3;
              const isMe = p.id === socket.id;
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius)',
                    background: isMe ? 'var(--primary-dim)' : 'var(--surface)',
                    border: `1px solid ${isMe ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`,
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', width: '28px', textAlign: 'center' }}>
                    {rank + 1}
                  </span>
                  <span style={{ flex: 1, fontWeight: isMe ? 600 : 400, color: isMe ? '#c4b5fd' : 'var(--text)' }}>
                    {p.name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text)' }}>
                    {p.score.toLocaleString('fr-FR')} pts
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          animation: 'fadeIn 0.5s ease 0.6s both',
        }}>
          <button className="btn btn-primary btn-lg" onClick={onPlayAgain}>
            ↩ Rejouer
          </button>
        </div>
      </div>
    </div>
  );
}
