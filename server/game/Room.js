import { isCorrect } from '../matching.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Room {
  constructor(code, hostId, hostName) {
    this.code = code;
    this.hostId = hostId;
    this.state = 'lobby'; // lobby | playing | round-end | finished
    this.players = new Map(); // socketId → player object
    this.playlist = []; // shuffled tracks
    this.currentRound = 0; // 0-indexed
    this.roundStartTime = null;
    this.roundTimer = null;
    this.currentVideo = null;
    this.speedOrder = []; // socketIds that completed (artist+title) this round
    this.config = { roundCount: 10, duration: 30 };

    this._addPlayer(hostId, hostName, true);
  }

  _addPlayer(socketId, name, isHost = false) {
    this.players.set(socketId, {
      id: socketId,
      name,
      isHost,
      score: 0,
      roundScore: 0,
      artistCorrect: false,
      titleCorrect: false,
      finished: false,
    });
  }

  addPlayer(socketId, name) {
    if (this.players.has(socketId)) return false;
    if (this.state !== 'lobby') return false;
    this._addPlayer(socketId, name, false);
    return true;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    if (socketId === this.hostId) {
      // Transfer host to first remaining player
      const first = this.players.keys().next().value;
      if (first) {
        this.hostId = first;
        this.players.get(first).isHost = true;
      }
    }
  }

  isEmpty() {
    return this.players.size === 0;
  }

  configure({ roundCount, duration }) {
    if (roundCount) this.config.roundCount = Math.min(Math.max(1, roundCount), 30);
    if (duration) this.config.duration = Math.min(Math.max(10, duration), 60);
  }

  setPlaylist(tracks) {
    this.playlist = shuffle(tracks).slice(0, this.config.roundCount);
    this.config.roundCount = this.playlist.length; // adjust if playlist shorter
  }

  startRound() {
    const track = this.playlist[this.currentRound];
    if (!track) return null;

    this.state = 'playing';
    this.roundStartTime = Date.now();
    this.speedOrder = [];
    this.currentVideo = track;

    // Randomize start position (between 30s and 90s into the video, or 0)
    const startSeconds = Math.floor(Math.random() * 60) + 30;

    // Reset per-round player state
    for (const p of this.players.values()) {
      p.roundScore = 0;
      p.artistCorrect = false;
      p.titleCorrect = false;
      p.finished = false;
    }

    return {
      roundIndex: this.currentRound,
      total: this.config.roundCount,
      videoId: track.videoId,
      startSeconds,
      duration: this.config.duration,
    };
  }

  submitAnswer(socketId, answerArtist, answerTitle) {
    const player = this.players.get(socketId);
    if (!player || this.state !== 'playing') return null;

    const { artist, title } = this.currentVideo;
    let points = 0;
    let artistCorrect = player.artistCorrect;
    let titleCorrect = player.titleCorrect;

    if (!player.artistCorrect && answerArtist?.trim()) {
      if (isCorrect(answerArtist, artist)) {
        player.artistCorrect = true;
        artistCorrect = true;
        points += 500;
      }
    }

    if (!player.titleCorrect && answerTitle?.trim()) {
      if (isCorrect(answerTitle, title)) {
        player.titleCorrect = true;
        titleCorrect = true;
        points += 500;
      }
    }

    // Speed bonus: first and second to complete both
    if (player.artistCorrect && player.titleCorrect && !player.finished) {
      player.finished = true;
      const rank = this.speedOrder.length;
      this.speedOrder.push(socketId);
      if (rank === 0) points += 200;
      else if (rank === 1) points += 100;
    }

    player.score += points;
    player.roundScore += points;

    return {
      artistCorrect,
      titleCorrect,
      points,
      totalScore: player.score,
    };
  }

  allPlayersFinished() {
    for (const p of this.players.values()) {
      if (!p.finished) return false;
    }
    return true;
  }

  endRound() {
    this.state = 'round-end';
    const scores = {};
    for (const [id, p] of this.players) {
      scores[id] = { name: p.name, score: p.score, roundScore: p.roundScore };
    }
    return {
      artist: this.currentVideo.artist,
      title: this.currentVideo.title,
      thumbnail: this.currentVideo.thumbnail,
      scores,
    };
  }

  nextRound() {
    this.currentRound++;
    if (this.currentRound >= this.config.roundCount) {
      this.state = 'finished';
      return null;
    }
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
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        isHost: p.isHost,
      })),
    };
  }
}
