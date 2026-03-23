import { useEffect, useRef, useState } from 'react';

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

function hideMediaSession() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: 'Blindtest',
    artist: '🎵',
    album: '',
    artwork: [],
  });
  navigator.mediaSession.setActionHandler('play', null);
  navigator.mediaSession.setActionHandler('pause', null);
  navigator.mediaSession.setActionHandler('previoustrack', null);
  navigator.mediaSession.setActionHandler('nexttrack', null);
}

export default function YoutubePlayer({ videoId, startSeconds, onReady, onError }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(80);

  useEffect(() => {
    if (!videoId) return;
    ensureYTApi();
    setPlaying(false);

    whenYTReady(() => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        width: '1', height: '1',
        videoId,
        playerVars: {
          autoplay: 1, start: startSeconds || 0,
          controls: 0, disablekb: 1, fs: 0,
          iv_load_policy: 3, modestbranding: 1, rel: 0,
        },
        events: {
          onReady: (e) => {
            e.target.setVolume(volume);
            e.target.playVideo();
            hideMediaSession();
            onReady?.();
          },
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              setPlaying(true);
              hideMediaSession();
            } else if (e.data !== window.YT.PlayerState.BUFFERING) {
              setPlaying(false);
            }
          },
          onError: () => onError?.(),
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

  const handleVolume = (e) => {
    const v = Number(e.target.value);
    setVolume(v);
    playerRef.current?.setVolume(v);
  };

  const bars = [3, 5, 8, 6, 9, 7, 5, 8, 4, 7, 6, 9, 5];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
      {/* Hidden iframe */}
      <div ref={containerRef} style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />

      {/* Visualizer */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '40px' }}>
        {bars.map((h, i) => (
          <div key={i} style={{
            width: '3px',
            height: `${h * 4}px`,
            borderRadius: '2px',
            background: playing
              ? `hsl(${260 + i * 4}, 70%, ${55 + i % 3 * 10}%)`
              : 'var(--surface-3)',
            transformOrigin: 'bottom',
            transition: 'background 0.3s',
            animation: playing ? `barPulse ${0.35 + i * 0.06}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.04}s`,
          }} />
        ))}
      </div>

      {/* Volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', maxWidth: '240px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}</span>
        <input
          type="range" min="0" max="100" value={volume}
          onChange={handleVolume}
          style={{
            flex: 1, height: '3px', accentColor: 'var(--primary)',
            background: `linear-gradient(to right, var(--primary) ${volume}%, var(--surface-3) ${volume}%)`,
            borderRadius: '2px', cursor: 'pointer',
            border: 'none', outline: 'none', padding: 0,
          }}
        />
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', width: '28px' }}>
          {volume}
        </span>
      </div>
    </div>
  );
}
