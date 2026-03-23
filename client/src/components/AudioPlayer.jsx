import { useEffect, useRef, useState } from 'react';

// ─── Persist volume across rounds ────────────────────────────────────────────
let globalVolume = 80;

// ─── YouTube API loader ───────────────────────────────────────────────────────
let ytLoaded = false, ytReady = false;
const ytCbs = [];
function ensureYT() {
  if (ytLoaded) return;
  ytLoaded = true;
  window.onYouTubeIframeAPIReady = () => { ytReady = true; ytCbs.forEach(f => f()); ytCbs.length = 0; };
  const s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(s);
}
function whenYTReady(cb) {
  if (ytReady && window.YT?.Player) cb(); else ytCbs.push(cb);
}
function hideMediaSession() {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: 'Blindtest', artist: '🎵', album: '' });
    ['play','pause','previoustrack','nexttrack'].forEach(a => navigator.mediaSession.setActionHandler(a, null));
  } catch {}
}

// ─── Visualizer ───────────────────────────────────────────────────────────────
function Visualizer({ playing }) {
  const h = [3,5,8,6,9,7,5,8,4,7,6,9,5];
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:'3px', height:'40px' }}>
      {h.map((v, i) => (
        <div key={i} style={{
          width:'3px', height:`${v*4}px`, borderRadius:'2px',
          background: playing ? `hsl(${260+i*4},70%,${55+i%3*10}%)` : 'var(--surface-3)',
          transformOrigin:'bottom', transition:'background 0.3s',
          animation: playing ? `barPulse ${0.35+i*0.06}s ease-in-out infinite alternate` : 'none',
          animationDelay:`${i*0.04}s`,
        }}/>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AudioPlayer({ source, videoId, previewUrl, startSeconds }) {
  const ytContainer = useRef(null);
  const ytPlayer    = useRef(null);
  const audioRef    = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume]   = useState(globalVolume);

  // ── YouTube ──
  useEffect(() => {
    if (source !== 'youtube' || !videoId) return;
    ensureYT();
    setPlaying(false);
    whenYTReady(() => {
      if (ytPlayer.current) { try { ytPlayer.current.destroy(); } catch {} }
      ytPlayer.current = new window.YT.Player(ytContainer.current, {
        width:'1', height:'1', videoId,
        playerVars: { autoplay:1, start:startSeconds||0, controls:0, disablekb:1, fs:0, iv_load_policy:3, modestbranding:1, rel:0 },
        events: {
          onReady: e => { e.target.setVolume(globalVolume); e.target.playVideo(); hideMediaSession(); },
          onStateChange: e => {
            setPlaying(e.data === window.YT.PlayerState.PLAYING);
            if (e.data === window.YT.PlayerState.PLAYING) hideMediaSession();
          },
        },
      });
    });
    return () => { if (ytPlayer.current) { try { ytPlayer.current.destroy(); } catch {} ytPlayer.current = null; } };
  }, [videoId, startSeconds, source]);

  // ── Deezer ──
  useEffect(() => {
    if (source !== 'deezer' || !previewUrl) return;
    setPlaying(false);

    // Use proxy (avoids any CORS issue)
    const url = `/api/audio-proxy?url=${encodeURIComponent(previewUrl)}`;
    const audio = new Audio(url);
    audio.volume = globalVolume / 100;
    // Muted autoplay trick: browser allows muted autoplay, unmute once playing
    audio.muted = true;
    audioRef.current = audio;

    const onPlaying = () => { audio.muted = false; setPlaying(true); hideMediaSession(); };
    const onPause   = () => setPlaying(false);
    const onEnded   = () => setPlaying(false);

    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause',   onPause);
    audio.addEventListener('ended',   onEnded);

    audio.play().catch(err => console.warn('Deezer autoplay blocked:', err));

    return () => {
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause',   onPause);
      audio.removeEventListener('ended',   onEnded);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [previewUrl, source]);

  const handleVolume = (v) => {
    globalVolume = v; // persist for next round
    setVolume(v);
    if (ytPlayer.current) try { ytPlayer.current.setVolume(v); } catch {}
    if (audioRef.current) audioRef.current.volume = v / 100;
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'16px', width:'100%' }}>
      <div ref={ytContainer} style={{ position:'absolute', width:1, height:1, opacity:0, pointerEvents:'none' }}/>
      <Visualizer playing={playing}/>
      {/* Volume */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', maxWidth:'220px' }}>
        <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>
          {volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}
        </span>
        <input type="range" min="0" max="100" value={volume} onChange={e => handleVolume(Number(e.target.value))}
          style={{
            flex:1, height:'3px', accentColor:'var(--primary)',
            background:`linear-gradient(to right,var(--primary) ${volume}%,var(--surface-3) ${volume}%)`,
            borderRadius:'2px', cursor:'pointer', border:'none', outline:'none', padding:0,
          }}
        />
        <span style={{ fontSize:'11px', color:'var(--text-muted)', fontFamily:'var(--font-mono)', width:'26px' }}>{volume}</span>
      </div>
    </div>
  );
}
