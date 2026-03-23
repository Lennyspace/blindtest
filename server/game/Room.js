import { isCorrect } from '../matching.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pick `count` tracks from pool with artist diversity:
// max 1 track per artist, shuffle the pool first for true randomness each game
function pickDiverse(pool, count) {
  const shuffled = shuffle(pool);
  const seen = new Set();
  const picked = [];

  // First pass: max 2 tracks per artist
  const artistCount = new Map();
  for (const track of shuffled) {
    if (picked.length >= count) break;
    const key = (track.artist || '').toLowerCase().trim();
    const n = artistCount.get(key) || 0;
    if (!key || n < 2) {
      picked.push(track);
      artistCount.set(key, n + 1);
    }
  }

  // Second pass: fill remaining slots if playlist has few artists
  if (picked.length < count) {
    for (const track of shuffled) {
      if (picked.length >= count) break;
      if (!picked.includes(track)) picked.push(track);
    }
  }

  return shuffle(picked); // shuffle again so order is random too
}

// Speed bonus: decreasing per rank
const SPEED_BONUS = [300, 200, 150, 100, 50];

export class Room {
  constructor(code, hostId, hostName) {
    this.code = code;
    this.hostId = hostId;
    this.state = 'lobby';
    this.players = new Map();
    this.playlist = [];
    this.playlistName = '';
    this.currentRound = 0;
    this.roundStartTime = null;
    this.roundTimer = null;
    this.currentVideo = null;
    this.speedOrder = [];
    this.config = { roundCount: 10, duration: 30, hints: true, autoNext: 8 };
    this._addPlayer(hostId, hostName, true);
  }

  _addPlayer(socketId, name, isHost = false) {
    this.players.set(socketId, {
      id: socketId, name, isHost,
      score: 0, roundScore: 0,
      artistCorrect: false, titleCorrect: false, finished: false,
    });
  }

  addPlayer(socketId, name) {
    if (this.players.has(socketId)) return false;
    if (this.state !== 'lobby') return false;
    const taken = Array.from(this.players.values()).some(
      p => p.name.toLowerCase() === name.toLowerCase()
    );
    if (taken) return false;
    this._addPlayer(socketId, name, false);
    return true;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    if (socketId === this.hostId) {
      const first = this.players.keys().next().value;
      if (first) { this.hostId = first; this.players.get(first).isHost = true; }
    }
  }

  isEmpty() { return this.players.size === 0; }

  configure({ roundCount, duration, hints, autoNext }) {
    if (roundCount) this.config.roundCount = Math.min(Math.max(1, roundCount), 30);
    if (duration)   this.config.duration   = Math.min(Math.max(10, duration), 90);
    if (hints !== undefined) this.config.hints = hints;
    if (autoNext)   this.config.autoNext   = Math.min(Math.max(3, autoNext), 30);
  }

  setPlaylist(tracks, name = '') {
    this.allTracks = tracks; // keep full pool for re-shuffling on replay
    this.playlist = pickDiverse(tracks, this.config.roundCount);
    this.config.roundCount = this.playlist.length;
    this.playlistName = name;
  }

  reshufflePlaylist() {
    if (!this.allTracks?.length) return;
    this.playlist = pickDiverse(this.allTracks, this.config.roundCount);
  }

  startRound() {
    const track = this.playlist[this.currentRound];
    if (!track) return null;
    this.state = 'playing';
    this.roundStartTime = Date.now();
    this.speedOrder = [];
    this.currentVideo = track;
    const startSeconds = Math.floor(Math.random() * 60) + 30;
    for (const p of this.players.values()) {
      p.roundScore = 0;
      p.artistCorrect = false;
      p.titleCorrect = false;
      p.finished = false;
      p.finishTime = null;
    }
    return {
      roundIndex: this.currentRound,
      total: this.config.roundCount,
      source: track.source || 'youtube',
      videoId: track.videoId,
      previewUrl: track.previewUrl,
      startSeconds,
      duration: this.config.duration,
      playlistName: this.playlistName,
    };
  }

  submitAnswer(socketId, answerArtist, answerTitle) {
    const player = this.players.get(socketId);
    if (!player || this.state !== 'playing') return null;
    const { artist, title } = this.currentVideo;
    let points = 0;
    let newArtist = player.artistCorrect;
    let newTitle  = player.titleCorrect;

    if (!player.artistCorrect && answerArtist?.trim()) {
      if (isCorrect(answerArtist, artist)) {
        player.artistCorrect = true; newArtist = true; points += 500;
      }
    }
    if (!player.titleCorrect && answerTitle?.trim()) {
      if (isCorrect(answerTitle, title)) {
        player.titleCorrect = true; newTitle = true; points += 500;
      }
    }

    if (player.artistCorrect && player.titleCorrect && !player.finished) {
      player.finished = true;
      player.finishTime = Date.now() - this.roundStartTime;
      const rank = this.speedOrder.length;
      this.speedOrder.push(socketId);
      points += SPEED_BONUS[rank] ?? 0;
    }

    player.score += points;
    player.roundScore += points;

    return {
      artistCorrect: newArtist,
      titleCorrect:  newTitle,
      // Reveal canonical value only when just found
      canonicalArtist: newArtist ? artist : null,
      canonicalTitle:  newTitle  ? title  : null,
      points,
      totalScore: player.score,
    };
  }

  getPlayerStatuses() {
    const s = {};
    for (const [id, p] of this.players) {
      s[id] = { artistCorrect: p.artistCorrect, titleCorrect: p.titleCorrect };
    }
    return s;
  }

  allPlayersFinished() {
    for (const p of this.players.values()) if (!p.finished) return false;
    return true;
  }

  endRound() {
    this.state = 'round-end';
    const scores = {};
    const stats = {};
    for (const [id, p] of this.players) {
      scores[id] = { name: p.name, score: p.score, roundScore: p.roundScore };
      stats[id] = {
        artistCorrect: p.artistCorrect,
        titleCorrect: p.titleCorrect,
        finishTime: p.finishTime, // ms, null if didn't finish
      };
    }
    return {
      artist: this.currentVideo.artist,
      title:  this.currentVideo.title,
      thumbnail: this.currentVideo.thumbnail,
      scores,
      stats,
    };
  }

  getHint() {
    if (!this.currentVideo) return null;
    const firstLetter = s => s?.trim()?.[0]?.toUpperCase() ?? '?';
    return {
      artistHint: firstLetter(this.currentVideo.artist),
      titleHint:  firstLetter(this.currentVideo.title),
    };
  }

  nextRound() {
    this.currentRound++;
    if (this.currentRound >= this.config.roundCount) { this.state = 'finished'; return null; }
    return this.startRound();
  }

  getFinalScores() {
    return Array.from(this.players.values())
      .map(p => ({ id: p.id, name: p.name, score: p.score, isHost: p.isHost }))
      .sort((a, b) => b.score - a.score);
  }

  publicState() {
    return {
      code: this.code,
      state: this.state,
      hostId: this.hostId,
      currentRound: this.currentRound,
      totalRounds: this.config.roundCount,
      config: this.config,
      playlistName: this.playlistName,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id, name: p.name, score: p.score, isHost: p.isHost,
      })),
    };
  }
}
