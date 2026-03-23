import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { Room } from './game/Room.js';
import { fetchPlaylistTracks, fetchPlaylistInfo, extractPlaylistId } from './youtube.js';
import { fetchDeezerTracks, fetchDeezerPlaylistInfo, extractDeezerPlaylistId } from './deezer.js';
import { THEMES } from './themes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const clientDist = join(__dirname, '../client/dist');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: isProd
    ? { origin: false }
    : { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST'] },
});

app.use(express.json());

// Serve React build in production
if (isProd && existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

// Health check
app.get('/health', (_, res) => res.json({ ok: true }));

// Serve themes list to client
app.get('/api/themes', (_, res) => res.json(THEMES.map(({ playlistId, ...rest }) => rest)));

// ─── Room registry ────────────────────────────────────────────────────────────
const rooms = new Map(); // code → Room

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function emitRoomState(room) {
  io.to(room.code).emit('room:state', room.publicState());
}

function scheduleRoundEnd(room, duration) {
  clearTimeout(room.roundTimer);
  room.roundTimer = setTimeout(() => {
    if (room.state !== 'playing') return;
    const result = room.endRound();
    io.to(room.code).emit('game:round-end', result);
    emitRoomState(room);
  }, duration * 1000);
}

// ─── Socket handlers ──────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  // Create a new room
  socket.on('room:create', ({ nickname }) => {
    const name = nickname?.trim().slice(0, 20);
    if (!name) return socket.emit('room:error', { message: 'Pseudo invalide' });

    const code = generateCode();
    const room = new Room(code, socket.id, name);
    rooms.set(code, room);

    socket.join(code);
    socket.emit('room:created', { code });
    emitRoomState(room);
  });

  // Join an existing room
  socket.on('room:join', ({ code, nickname }) => {
    const name = nickname?.trim().slice(0, 20);
    if (!name) return socket.emit('room:error', { message: 'Pseudo invalide' });

    const room = rooms.get(code?.toUpperCase());
    if (!room) return socket.emit('room:error', { message: 'Partie introuvable' });
    if (room.state !== 'lobby') return socket.emit('room:error', { message: 'Partie déjà en cours' });

    // Check for duplicate name
    const taken = Array.from(room.players.values()).some(
      p => p.name.toLowerCase() === name.toLowerCase()
    );
    if (taken) return socket.emit('room:error', { message: 'Ce pseudo est déjà pris' });

    const ok = room.addPlayer(socket.id, name);
    if (!ok) return socket.emit('room:error', { message: 'Impossible de rejoindre' });

    socket.join(code);
    socket.emit('room:joined', { code });
    emitRoomState(room);
  });

  // Host configures the game (playlist + settings)
  socket.on('game:configure', async ({ code, playlistId, customUrl, roundCount, duration }) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    if (room.state !== 'lobby') return;

    room.configure({ roundCount, duration });

    // Detect source and resolve ID
    const isDeezer = customUrl?.includes('deezer.com');
    let pid = playlistId;

    if (customUrl) {
      if (isDeezer) {
        pid = extractDeezerPlaylistId(customUrl);
        if (!pid) return socket.emit('room:error', { message: 'URL Deezer invalide' });
      } else {
        pid = extractPlaylistId(customUrl);
        if (!pid) return socket.emit('room:error', { message: 'URL YouTube invalide' });
      }
    } else if (!pid) {
      pid = THEMES[0].playlistId;
    } else {
      const theme = THEMES.find(t => t.id === pid);
      if (theme) pid = theme.playlistId;
    }

    try {
      socket.emit('room:loading', { message: 'Chargement de la playlist...' });
      let tracks, playlistName;

      if (isDeezer) {
        [tracks, playlistName] = await Promise.all([
          fetchDeezerTracks(pid, 200),
          fetchDeezerPlaylistInfo(pid).catch(() => 'Playlist Deezer'),
        ]);
      } else {
        [tracks, playlistName] = await Promise.all([
          fetchPlaylistTracks(pid, process.env.YOUTUBE_API_KEY, 200),
          fetchPlaylistInfo(pid, process.env.YOUTUBE_API_KEY).catch(() => ''),
        ]);
      }

      if (!tracks.length) return socket.emit('room:error', { message: 'Playlist vide ou inaccessible' });
      room.setPlaylist(tracks, playlistName);
      socket.emit('room:configured', { trackCount: tracks.length, playlistName });
      emitRoomState(room);
    } catch (err) {
      console.error('Playlist error:', err.message);
      socket.emit('room:error', { message: 'Impossible de charger la playlist' });
    }
  });

  // Host starts the game
  socket.on('game:start', ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    if (room.state !== 'lobby') return;
    if (!room.playlist.length) return socket.emit('room:error', { message: 'Aucune playlist choisie' });
    if (room.players.size < 1) return;

    // Re-shuffle pool every new game for variety
    room.reshufflePlaylist();
    room.currentRound = 0;
    // Reset scores
    for (const p of room.players.values()) p.score = 0;

    const roundData = room.startRound();
    if (!roundData) return;

    io.to(code).emit('game:round-start', roundData);
    emitRoomState(room);
    scheduleRoundEnd(room, roundData.duration);
  });

  // Player submits an answer
  socket.on('answer:submit', ({ code, artist, title }) => {
    const room = rooms.get(code);
    if (!room || room.state !== 'playing') return;

    const result = room.submitAnswer(socket.id, artist, title);
    if (!result) return;

    socket.emit('answer:result', result);

    // Broadcast updated per-player statuses to everyone
    io.to(code).emit('game:player-statuses', room.getPlayerStatuses());

    // Check if everyone finished → end round early
    if (room.allPlayersFinished()) {
      clearTimeout(room.roundTimer);
      const roundResult = room.endRound();
      io.to(code).emit('game:round-end', roundResult);
      emitRoomState(room);
    }
  });

  // Host advances to next round
  socket.on('round:next', ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    if (room.state !== 'round-end') return;

    const roundData = room.nextRound();
    if (!roundData) {
      // Game over
      const finalScores = room.getFinalScores();
      io.to(code).emit('game:over', { finalScores });
      emitRoomState(room);
      return;
    }

    io.to(code).emit('game:round-start', roundData);
    emitRoomState(room);
    scheduleRoundEnd(room, roundData.duration);
  });

  // Host explicitly ends game
  socket.on('game:end', ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    clearTimeout(room.roundTimer);
    const finalScores = room.getFinalScores();
    io.to(code).emit('game:over', { finalScores });
  });

  // Disconnect cleanup
  socket.on('disconnect', () => {
    for (const [code, room] of rooms) {
      if (!room.players.has(socket.id)) continue;
      room.removePlayer(socket.id);
      if (room.isEmpty()) {
        clearTimeout(room.roundTimer);
        rooms.delete(code);
      } else {
        io.to(code).emit('room:player-left', { playerId: socket.id });
        emitRoomState(room);
      }
      break;
    }
  });
});

// SPA fallback in production
if (isProd && existsSync(clientDist)) {
  app.get('*', (_, res) => res.sendFile(join(clientDist, 'index.html')));
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`🎵  Blindtest server on http://localhost:${PORT}`));
