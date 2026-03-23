import { useRef, useEffect } from 'react';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Scoreboard({ players = [], myId, roundResult, compact = false }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const prevScores = useRef({});

  // Track score deltas
  useEffect(() => {
    if (!roundResult) return;
    const next = {};
    for (const p of players) next[p.id] = p.score;
    prevScores.current = next;
  }, [roundResult]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      width: '100%',
    }}>
      {sorted.map((p, i) => {
        const isMe = p.id === myId;
        const delta = roundResult?.scores?.[p.id]?.roundScore;

        return (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: compact ? '8px 12px' : '12px 16px',
              borderRadius: 'var(--radius)',
              background: isMe ? 'var(--primary-dim)' : 'var(--surface-2)',
              border: `1px solid ${isMe ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`,
              position: 'relative',
              transition: 'all 0.3s ease',
              animation: roundResult ? 'fadeIn 0.3s ease' : 'none',
            }}
          >
            {/* Rank */}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: compact ? '14px' : '16px',
              color: i < 3 ? 'var(--text)' : 'var(--text-muted)',
              width: '24px',
              textAlign: 'center',
            }}>
              {i < 3 ? MEDALS[i] : `${i + 1}`}
            </span>

            {/* Name */}
            <span style={{
              flex: 1,
              fontSize: compact ? '14px' : '15px',
              fontWeight: isMe ? 600 : 400,
              color: isMe ? '#c4b5fd' : 'var(--text-dim)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {p.name}{isMe && ' (toi)'}
            </span>

            {/* Score */}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: compact ? '13px' : '15px',
              fontWeight: 700,
              color: isMe ? '#a78bfa' : 'var(--text)',
            }}>
              {p.score.toLocaleString('fr-FR')}
            </span>

            {/* Delta */}
            {delta > 0 && (
              <span
                key={`delta-${p.id}-${delta}`}
                className="score-delta"
              >
                +{delta}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
