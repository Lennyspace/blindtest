import { useState, useEffect, useRef } from 'react';

const SIZE = 120;
const STROKE = 6;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

export default function CircularTimer({ duration, onEnd, paused }) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const rafRef = useRef(null);

  useEffect(() => {
    startRef.current = Date.now();
    setElapsed(0);

    const tick = () => {
      const now = Date.now();
      const e = Math.min((now - startRef.current) / 1000, duration);
      setElapsed(e);
      if (e < duration) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onEnd?.();
      }
    };

    if (!paused) {
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [duration, paused]);

  const remaining = Math.max(0, duration - elapsed);
  const progress = 1 - elapsed / duration;
  const offset = CIRC * (1 - progress);
  const secs = Math.ceil(remaining);

  const urgent = secs <= 10;
  const color = urgent ? 'var(--error)' : secs <= 20 ? 'var(--warning)' : 'var(--primary)';
  const glowColor = urgent ? 'rgba(244,63,94,0.4)' : secs <= 20 ? 'rgba(245,158,11,0.3)' : 'var(--primary-glow)';

  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
      <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={STROKE}
        />
        {/* Progress */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke 0.3s ease',
            filter: `drop-shadow(0 0 6px ${glowColor})`,
          }}
        />
      </svg>
      {/* Number */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: '28px',
        fontWeight: 700,
        color,
        transition: 'color 0.3s',
        ...(urgent && secs <= 5 ? { animation: 'pulse-glow 0.8s ease infinite' } : {}),
      }}>
        {secs}
      </div>
    </div>
  );
}
