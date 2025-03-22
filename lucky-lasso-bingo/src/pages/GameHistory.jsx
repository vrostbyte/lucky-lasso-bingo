import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/layout/Header';

const GameHistory = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load game data
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        const gameDoc = await getDoc(doc(db, 'games', gameId));

        if (!gameDoc.exists()) {
          setError('Game not found');
          setLoading(false);
          return;
        }

        const gameData = {
          id: gameDoc.id,
          ...gameDoc.data(),
          createdAt: gameDoc.data().createdAt?.toDate() || new Date(),
          startTime: gameDoc.data().startTime?.toDate(),
          endTime: gameDoc.data().endTime?.toDate(),
          lastBallDrawn: gameDoc.data().lastBallDrawn?.toDate(),
        };

        setGame(gameData);
      } catch (err) {
        console.error('Error fetching game data:', err);
        setError('Failed to load game history');
      } finally {
        setLoading(false);
      }
    };

    fetchGameData();
  }, [gameId]);

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getBallColor = (ball) => {
    if (!ball) return 'bg-gray-300';
    const letter = ball.charAt(0);
    const colors = {
      B: 'bg-bluebell',
      I: 'bg-olivine',
      N: 'bg-lilac',
      G: 'bg-dahlia',
      O: 'bg-deep-sage',
    };
    return colors[letter] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory">
        <Header title="Loading History..." />
        <div className="container mx-auto p-6 text-center">
          <p className="text-deep-sage">Loading game history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ivory">
        <Header title="History Error" />
        <div className="container mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 bg-bluebell text-white py-2 px-4 rounded"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <Header title="Game History" />
      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-deep-sage mb-2">
                {game.eventName} - Game #{game.gameNumber}
              </h2>
              <p className="text-deep-sage mb-1"><span className="font-medium">Pattern:</span> {game.patternName}</p>
              <p className="text-deep-sage mb-1"><span className="font-medium">Prize:</span> {game.prize}</p>
              <p className="text-deep-sage mb-1"><span className="font-medium">Verification Code:</span> {game.verificationCode}</p>
            </div>
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-white ${
                game.status === 'completed' ? 'bg-gray-500' :
                game.status === 'in_progress' ? 'bg-olivine' :
                game.status === 'paused' ? 'bg-deep-sage' : 'bg-bluebell'
              }`}>
                {game.status === 'completed' ? 'Completed' :
                 game.status === 'in_progress' ? 'In Progress' :
                 game.status === 'paused' ? 'Paused' : 'Ready'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-lilac bg-opacity-20 p-3 rounded-lg">
              <p className="text-sm text-deep-sage">Game Created</p>
              <p className="text-deep-sage font-medium">{game.createdAt?.toLocaleString() || 'Unknown'}</p>
            </div>
            <div className="bg-lilac bg-opacity-20 p-3 rounded-lg">
              <p className="text-sm text-deep-sage">Game Started</p>
              <p className="text-deep-sage font-medium">{game.startTime?.toLocaleString() || 'Not started'}</p>
            </div>
            <div className="bg-lilac bg-opacity-20 p-3 rounded-lg">
              <p className="text-sm text-deep-sage">Game Ended</p>
              <p className="text-deep-sage font-medium">{game.endTime?.toLocaleString() || 'Not ended'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-lilac bg-opacity-20 p-3 rounded-lg">
              <p className="text-sm text-deep-sage">Duration</p>
              <p className="text-deep-sage font-medium">{formatTime(game.duration)}</p>
            </div>
            <div className="bg-lilac bg-opacity-20 p-3 rounded-lg">
              <p className="text-sm text-deep-sage">Balls Drawn</p>
              <p className="text-deep-sage font-medium">{game.drawnBalls?.length || 0} / 75</p>
            </div>
            <div className="bg-lilac bg-opacity-20 p-3 rounded-lg">
              <p className="text-sm text-deep-sage">Last Ball Drawn</p>
              <p className="text-deep-sage font-medium">{game.drawnBalls?.length > 0 ? game.drawnBalls[game.drawnBalls.length - 1] : 'None'}</p>
            </div>
          </div>

          {game.status === 'completed' && (
            <div className="mt-6 p-4 border border-olivine rounded-lg">
              <h3 className="text-lg font-semibold text-deep-sage mb-2">Game Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-sm text-deep-sage">Total Pot</p>
                  <p className="text-deep-sage font-medium">${game.potAmount?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-sm text-deep-sage">Winners</p>
                  <p className="text-deep-sage font-medium">{game.winnerCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-deep-sage">Payout Per Winner</p>
                  <p className="text-deep-sage font-medium">${game.actualPayoutPerWinner?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 mt-2">
                <div>
                  <p className="text-sm text-deep-sage">Calculated Payout</p>
                  <p className="text-deep-sage font-medium">${game.calculatedPayoutPerWinner?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-sm text-deep-sage">Rounding Loss</p>
                  <p className="text-deep-sage font-medium">${game.roundingLoss?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
              {game.winnerNames && game.winnerNames.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-deep-sage">Winner Names:</p>
                  <p className="text-deep-sage font-medium">{game.winnerNames.join(', ')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-deep-sage mb-4">Drawn Balls</h3>
          {!game.drawnBalls || game.drawnBalls.length === 0 ? (
            <p className="text-center text-gray-600 py-6">No balls have been drawn for this game.</p>
          ) : (
            <div>
              <div className="flex flex-wrap gap-2 mb-6">
                {game.drawnBalls.map((ball, index) => (
                  <div
                    key={index}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold ${getBallColor(ball)}`}
                  >
                    {ball}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600">Balls are shown in the order they were drawn (first to last).</p>
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => navigate(`/event/${game.eventId}`)}
              className="bg-bluebell text-white py-2 px-4 rounded"
            >
              Back to Event
            </button>
            {game.status !== 'completed' && (
              <button
                onClick={() => navigate(`/game/${game.id}`)}
                className="bg-olivine text-white py-2 px-4 rounded"
              >
                Continue Game
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameHistory;
