import { useEffect, useRef, useState } from 'react';

// Load the YT IFrame API once globally
let ytApiLoaded = false;
let ytApiReady = false;
const ytCallbacks = [];

function ensureYTApi() {
  if (ytApiLoaded) return;
  ytApiLoaded = true;
  window.onYouTubeIframeAPIReady = () => {
    ytApiReady = true;
    ytCallbacks.forEach(cb => cb());
    ytCallbacks.length = 0;
  };
  const s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(s);
}

function whenYTReady(cb) {
  if (ytApiReady && window.YT?.Player) cb();
  else ytCallbacks.push(cb);
}

// Music visualizer bars (shown while audio plays)
function Visualizer({ playing }) {
  const bars = [4, 7, 5, 9, 6, 8, 4, 7, 6, 5, 8, 7];
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      gap: '4px',
      height: '48px',
    }}>
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            width: '4px',
            height: `${h * 4}px`,
            background: 'var(--primary)',
            borderRadius: '2px',
            opacity: playing ? 1 : 0.3,
            transformOrigin: 'bottom',
            animation: playing
              ? `barPulse ${0.4 + i * 0.07}s ease-in-out infinite alternate`
              : 'none',
            animationDelay: `${i * 0.05}s`,
            boxShadow: playing ? '0 0 6px var(--primary-glow)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

export default function YoutubePlayer({ videoId, startSeconds, onReady, onError }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState('Chargement…');

  useEffect(() => {
    if (!videoId) return;
    ensureYTApi();
    setPlaying(false);
    setStatus('Chargement…');

    whenYTReady(() => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        width: '1',
        height: '1',
        videoId,
        playerVars: {
          autoplay: 1,
          start: startSeconds || 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (e) => {
            e.target.setVolume(80);
            e.target.playVideo();
            setStatus('En cours…');
            onReady?.();
          },
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              setPlaying(true);
              setStatus('En cours…');
            } else if (e.data === window.YT.PlayerState.BUFFERING) {
              setStatus('Chargement…');
            } else if (e.data === window.YT.PlayerState.ENDED) {
              setPlaying(false);
            }
          },
          onError: () => {
            setStatus('Erreur de lecture');
            onError?.();
          },
        },
      });
    });

    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, [videoId, startSeconds]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
    }}>
      {/* Hidden player iframe */}
      <div
        ref={containerRef}
        style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
      />

      {/* Visual feedback */}
      <div style={{
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: 'var(--surface-2)',
        border: `2px solid ${playing ? 'var(--primary)' : 'var(--border)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '40px',
        boxShadow: playing ? 'var(--glow-primary)' : 'none',
        animation: playing ? 'pulse-glow 2s ease infinite' : 'none',
        transition: 'all 0.3s ease',
      }}>
        🎵
      </div>

      <Visualizer playing={playing} />

      <p style={{
        fontSize: '13px',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.05em',
      }}>
        {status}
      </p>
    </div>
  );
}
