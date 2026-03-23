import { useState, useEffect } from 'react';
import { socket } from './socket.js';
import Home from './pages/Home.jsx';
import Lobby from './pages/Lobby.jsx';
import Game from './pages/Game.jsx';
import Results from './pages/Results.jsx';

// Pages: home | lobby | game | results
export default function App() {
  const [page, setPage] = useState('home');
  const [roomCode, setRoomCode] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [gameData, setGameData] = useState(null);   // current round data
  const [roundResult, setRoundResult] = useState(null);
  const [finalScores, setFinalScores] = useState(null);
  const [myAnswer, setMyAnswer] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    socket.connect();

    socket.on('room:created', ({ code }) => {
      setRoomCode(code);
      setPage('lobby');
      setError(null);
    });

    socket.on('room:joined', ({ code }) => {
      setRoomCode(code);
      setPage('lobby');
      setError(null);
    });

    socket.on('room:state', (state) => {
      setRoomState(state);
      if (state.state === 'finished') setPage('results');
    });

    socket.on('room:error', ({ message }) => {
      setError(message);
    });

    socket.on('room:loading', ({ message }) => {
      setError(null);
      // Could show a loading state
    });

    socket.on('room:configured', () => {
      setError(null);
    });

    socket.on('game:round-start', (data) => {
      setGameData(data);
      setRoundResult(null);
      setMyAnswer(null);
      setPage('game');
      setError(null);
    });

    socket.on('game:round-end', (result) => {
      setRoundResult(result);
    });

    socket.on('answer:result', (result) => {
      setMyAnswer(result);
    });

    socket.on('game:over', ({ finalScores }) => {
      setFinalScores(finalScores);
      setPage('results');
    });

    return () => socket.disconnect();
  }, []);

  const goHome = () => {
    setPage('home');
    setRoomCode(null);
    setRoomState(null);
    setGameData(null);
    setRoundResult(null);
    setFinalScores(null);
    setMyAnswer(null);
    setError(null);
  };

  if (page === 'home') return <Home error={error} setError={setError} />;
  if (page === 'lobby') return (
    <Lobby
      code={roomCode}
      roomState={roomState}
      error={error}
      setError={setError}
      onLeave={goHome}
    />
  );
  if (page === 'game') return (
    <Game
      code={roomCode}
      roomState={roomState}
      gameData={gameData}
      roundResult={roundResult}
      myAnswer={myAnswer}
    />
  );
  const playAgain = () => {
    const isHost = roomState?.hostId === socket.id;
    if (isHost && roomCode) {
      socket.emit('game:reset', { code: roomCode });
      setFinalScores(null);
      setGameData(null);
      setRoundResult(null);
      setMyAnswer(null);
      setPage('lobby');
    } else {
      goHome();
    }
  };

  if (page === 'results') return (
    <Results
      finalScores={finalScores}
      roomState={roomState}
      onPlayAgain={playAgain}
    />
  );
}
