import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/layout/Header';

const GameView = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  
  // Game state
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentBall, setCurrentBall] = useState(null);
  const [drawnBalls, setDrawnBalls] = useState([]);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  // Payout calculation state
  const [potAmount, setPotAmount] = useState('');
  const [winnerCount, setWinnerCount] = useState(1);
  const [winnerName, setWinnerName] = useState('');
  const [calculatedPayout, setCalculatedPayout] = useState(0);
  const [actualPayout, setActualPayout] = useState(0);
  const [roundingLoss, setRoundingLoss] = useState(0);
  const [saving, setSaving] = useState(false);
  
  // Ball drawing state
  const [drawing, setDrawing] = useState(false);
  const [manualDrawMode, setManualDrawMode] = useState(false);
  const [manualBall, setManualBall] = useState('');
  
  // End game modal state
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  
  // Load game data from Firestore
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const gameDoc = await getDoc(doc(db, 'games', gameId));
        
        if (gameDoc.exists()) {
          const gameData = {
            id: gameDoc.id,
            ...gameDoc.data(),
            createdAt: gameDoc.data().createdAt?.toDate() || new Date()
          };
          
          setGame(gameData);
          setDrawnBalls(gameData.drawnBalls || []);
          if (gameData.drawnBalls && gameData.drawnBalls.length > 0) {
            setCurrentBall(gameData.drawnBalls[gameData.drawnBalls.length - 1]);
          }
          
          // Subscribe to real-time updates for this game
          const unsubscribe = onSnapshot(doc(db, 'games', gameId), (docSnap) => {
            if (docSnap.exists()) {
              const updatedGame = {
                id: docSnap.id,
                ...docSnap.data(),
                createdAt: docSnap.data().createdAt?.toDate() || new Date()
              };
              
              setGame(updatedGame);
              setDrawnBalls(updatedGame.drawnBalls || []);
              
              // Update current ball if there are drawn balls
              if (updatedGame.drawnBalls && updatedGame.drawnBalls.length > 0) {
                setCurrentBall(updatedGame.drawnBalls[updatedGame.drawnBalls.length - 1]);
              }
            }
          });
          
          return () => unsubscribe();
        } else {
          setError('Game not found');
        }
      } catch (err) {
        console.error('Error loading game:', err);
        setError('Failed to load game data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGame();
  }, [gameId]);
  
  // Persistent Timer Effect:
  // Calculate elapsed time based on the stored startTime to ensure persistence
  useEffect(() => {
    if (game && game.startTime && !game.endTime) {
      const startTime = game.startTime.toDate ? game.startTime.toDate() : new Date(game.startTime);
      timerRef.current = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now - startTime) / 1000);
        setTimer(diff);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [game]);
  
  // Format timer as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Draw a new random ball
  const drawNewBall = async () => {
    if (drawing) return;
    setDrawing(true);
    
    try {
      // Get all possible balls
      const allBalls = getAllBingoBalls();
      
      // Filter out already drawn balls
      const availableBalls = allBalls.filter(ball => !drawnBalls.includes(ball));
      
      if (availableBalls.length === 0) {
        alert('All balls have been drawn!');
        setDrawing(false);
        return;
      }
      
      // Select a random ball from the available balls
      const newBall = availableBalls[Math.floor(Math.random() * availableBalls.length)];
      
      // Update the game in Firestore
      await updateDoc(doc(db, 'games', gameId), {
        drawnBalls: arrayUnion(newBall),
        lastBallDrawn: new Date()
      });
      
      setCurrentBall(newBall);
    } catch (err) {
      console.error('Error drawing ball:', err);
      alert('Failed to draw ball');
    } finally {
      setDrawing(false);
    }
  };
  
  // Handle manual ball entry with validation
  const handleManualBallSubmit = async (e) => {
    e.preventDefault();
    
    const letter = manualBall.charAt(0);
    const number = parseInt(manualBall.substring(1));
    
    if (!['B', 'I', 'N', 'G', 'O'].includes(letter)) {
      alert('Invalid letter. Use B, I, N, G, or O.');
      return;
    }
    
    const validRanges = {
      'B': [1, 15],
      'I': [16, 30],
      'N': [31, 45],
      'G': [46, 60],
      'O': [61, 75]
    };
    
    const range = validRanges[letter];
    if (number < range[0] || number > range[1]) {
      alert(`For ${letter}, numbers must be between ${range[0]} and ${range[1]}.`);
      return;
    }
    
    if (drawnBalls.includes(manualBall)) {
      alert('This ball has already been drawn.');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'games', gameId), {
        drawnBalls: arrayUnion(manualBall),
        lastBallDrawn: new Date()
      });
      
      setManualBall('');
    } catch (err) {
      console.error('Error adding manual ball:', err);
      alert('Failed to add ball');
    }
  };
  
  // Generate all possible bingo balls
  const getAllBingoBalls = () => {
    const balls = [];
    for (let i = 1; i <= 15; i++) {
      balls.push(`B${i}`);
    }
    for (let i = 16; i <= 30; i++) {
      balls.push(`I${i}`);
    }
    for (let i = 31; i <= 45; i++) {
      balls.push(`N${i}`);
    }
    for (let i = 46; i <= 60; i++) {
      balls.push(`G${i}`);
    }
    for (let i = 61; i <= 75; i++) {
      balls.push(`O${i}`);
    }
    return balls;
  };
  
  // Start the game
  const handleStartGame = async () => {
    setIsGameRunning(true);
    try {
      await updateDoc(doc(db, 'games', gameId), {
        status: 'in_progress',
        startTime: new Date()
      });
    } catch (err) {
      console.error('Error starting game:', err);
    }
  };
  
  // Pause the game
  const handlePauseGame = async () => {
    setIsGameRunning(false);
    try {
      await updateDoc(doc(db, 'games', gameId), {
        status: 'paused'
      });
    } catch (err) {
      console.error('Error pausing game:', err);
    }
  };
  
  // End the game (opens modal)
  const handleEndGame = () => {
    if (!window.confirm('Are you sure you want to end this game?')) {
      return;
    }
    
    setIsGameRunning(false);
    
    if (game.allocatedAmount) {
      setPotAmount(game.allocatedAmount.toString());
      calculatePayouts(game.allocatedAmount, 1);
    }
    
    setShowEndGameModal(true);
  };
  
  // Calculate payouts and rounding loss
  const calculatePayouts = (potAmount, winnerCount) => {
    if (!potAmount || !winnerCount || potAmount <= 0 || winnerCount <= 0) {
      setCalculatedPayout(0);
      setActualPayout(0);
      setRoundingLoss(0);
      return;
    }
    
    const pot = parseFloat(potAmount);
    const winners = parseInt(winnerCount);
    
    const calculatedAmount = pot / winners;
    setCalculatedPayout(calculatedAmount);
    
    const roundedAmount = Math.ceil(calculatedAmount);
    setActualPayout(roundedAmount);
    
    const lossPerWinner = roundedAmount - calculatedAmount;
    const totalLoss = lossPerWinner * winners;
    setRoundingLoss(totalLoss);
  };
  
  // Finalize the game and record results
  const finalizeGame = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const totalPot = parseFloat(potAmount);
      const winners = parseInt(winnerCount);
      const winnersList = winnerName.split(',').map(name => name.trim());
      
      const calculatedPayoutPerWinner = totalPot / winners;
      const actualPayoutPerWinner = Math.ceil(calculatedPayoutPerWinner);
      const totalActualPayout = actualPayoutPerWinner * winners;
      const roundingLossCalc = totalActualPayout - totalPot;
      
      await updateDoc(doc(db, 'games', gameId), {
        status: 'completed',
        endTime: new Date(),
        duration: timer,
        potAmount: totalPot,
        winnerCount: winners,
        winnerNames: winnersList,
        calculatedPayoutPerWinner: calculatedPayoutPerWinner,
        actualPayoutPerWinner: actualPayoutPerWinner,
        totalActualPayout: totalActualPayout,
        roundingLoss: roundingLossCalc
      });
      
      alert('Game has ended and payouts have been recorded.');
      navigate('/dashboard');
    } catch (err) {
      console.error('Error finalizing game:', err);
      alert('Failed to save game results. Please try again.');
      setSaving(false);
    }
  };
  
  // Ball colors for each column
  const getBallColor = (ball) => {
    if (!ball) return 'bg-gray-300';
    
    const letter = ball.charAt(0);
    const colors = {
      'B': 'bg-bluebell',
      'I': 'bg-olivine',
      'N': 'bg-lilac',
      'G': 'bg-dahlia',
      'O': 'bg-deep-sage',
    };
    
    return colors[letter] || 'bg-gray-500';
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-ivory">
        <Header title="Loading Game..." />
        <div className="container mx-auto p-6 text-center">
          <p className="text-deep-sage">Loading game details...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-ivory">
        <Header title="Game Error" />
        <div className="container mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
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
      <Header title={`Game #${game.gameNumber}`} />
      
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left sidebar - Game info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <h2 className="text-lg font-bold mb-4 text-deep-sage">Game Info</h2>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Event:</p>
                  <p className="font-semibold text-deep-sage">{game.eventName}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Pattern:</p>
                  <p className="font-semibold text-deep-sage">{game.patternName}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Prize:</p>
                  <p className="font-semibold text-deep-sage">{game.prize}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Game Time:</p>
                  <p className="font-semibold text-deep-sage">{formatTime(timer)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Verification Code:</p>
                  <p className="font-mono font-semibold text-deep-sage">{game.verificationCode}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Balls Drawn:</p>
                  <p className="font-semibold text-deep-sage">{drawnBalls.length} / 75</p>
                </div>
              </div>
            </div>
            
            {/* Quick Verification */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <h3 className="text-md font-bold mb-3 text-deep-sage">Quick Verification</h3>
              <p className="text-sm mb-2">Enter a card number to verify:</p>
              
              <div className="flex">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border rounded-l-md"
                  placeholder="Card #"
                />
                <button
                  className="bg-bluebell text-white px-4 py-2 rounded-r-md"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
          
          {/* Center - Current ball and controls */}
          <div className="lg:col-span-2">
            {/* Current ball display */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-4 flex flex-col items-center">
              <h2 className="text-lg font-semibold mb-4 text-deep-sage">Current Ball</h2>
              
              <div 
                className={`w-36 h-36 rounded-full flex items-center justify-center text-white text-5xl font-bold mb-4 ${getBallColor(currentBall)}`}
              >
                {currentBall || '?'}
              </div>
              
              {/* Ball drawing controls */}
              <div className="flex w-full justify-center space-x-4 mb-2">
                <button 
                  onClick={() => setManualDrawMode(false)}
                  className={`py-2 px-4 rounded-full font-medium ${!manualDrawMode ? 'bg-bluebell text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Auto Draw
                </button>
                
                <button 
                  onClick={() => setManualDrawMode(true)}
                  className={`py-2 px-4 rounded-full font-medium ${manualDrawMode ? 'bg-bluebell text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Manual Entry
                </button>
              </div>
              
              {manualDrawMode ? (
                <form onSubmit={handleManualBallSubmit} className="w-full mt-2 flex">
                  <input
                    type="text"
                    value={manualBall}
                    onChange={(e) => setManualBall(e.target.value.toUpperCase())}
                    placeholder="e.g. B12"
                    className="flex-1 px-3 py-2 border rounded-l-md"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-olivine text-white px-4 py-2 rounded-r-md"
                  >
                    Add Ball
                  </button>
                </form>
              ) : (
                <button 
                  onClick={drawNewBall}
                  className="w-full py-2 px-6 rounded-full font-semibold text-white bg-olivine mt-2"
                  disabled={drawing}
                >
                  {drawing ? 'Drawing...' : 'Draw Next Ball'}
                </button>
              )}
            </div>
            
            {/* Game controls */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <div className="flex justify-between">
                <button 
                  onClick={() => navigate('/verify')}
                  className="py-2 px-4 rounded font-medium text-white bg-bluebell"
                >
                  Card Verification
                </button>
                
                <div className="flex space-x-2">
                  {!isGameRunning ? (
                    <button 
                      onClick={handleStartGame}
                      className="py-2 px-4 rounded font-medium text-white bg-olivine"
                    >
                      Start Game
                    </button>
                  ) : (
                    <button 
                      onClick={handlePauseGame}
                      className="py-2 px-4 rounded font-medium text-white bg-deep-sage"
                    >
                      Pause Game
                    </button>
                  )}
                  
                  <button 
                    onClick={handleEndGame}
                    className="py-2 px-4 rounded font-medium text-white bg-dahlia"
                  >
                    End Game
                  </button>
                </div>
              </div>
            </div>
            
            {/* Previously drawn balls */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-bold mb-4 text-deep-sage">Previously Drawn Balls</h3>
              
              {drawnBalls.length === 0 ? (
                <p className="text-center text-gray-500 my-4">No balls have been drawn yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {[...drawnBalls].reverse().map((ball, index) => (
                    <div 
                      key={index} 
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold ${getBallColor(ball)}`}
                    >
                      {ball}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Right sidebar - Ball board */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 overflow-y-auto">
              <h2 className="text-lg font-bold mb-4 text-center text-deep-sage">Ball Board</h2>
              
              {/* Column Headers */}
              <div className="grid grid-cols-5 gap-1 mb-3">
                {['B', 'I', 'N', 'G', 'O'].map((letter) => (
                  <div 
                    key={letter} 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${getBallColor(letter + '1')}`}
                  >
                    {letter}
                  </div>
                ))}
              </div>
              
              {/* Number Grid */}
              <div className="grid grid-cols-5 gap-1">
                {/* B Column */}
                <div className="flex flex-col gap-1">
                  {Array.from({ length: 15 }, (_, i) => i + 1).map((num) => {
                    const ball = `B${num}`;
                    const isDrawn = drawnBalls.includes(ball);
                    return (
                      <div 
                        key={ball} 
                        className={`w-8 h-8 rounded flex items-center justify-center text-xs ${
                          isDrawn ? 'bg-gray-300 line-through text-gray-600' : 'bg-bluebell bg-opacity-10 text-bluebell'
                        }`}
                      >
                        {num}
                      </div>
                    );
                  })}
                </div>
                {/* I Column */}
                <div className="flex flex-col gap-1">
                  {Array.from({ length: 15 }, (_, i) => i + 16).map((num) => {
                    const ball = `I${num}`;
                    const isDrawn = drawnBalls.includes(ball);
                    return (
                      <div 
                        key={ball} 
                        className={`w-8 h-8 rounded flex items-center justify-center text-xs ${
                          isDrawn ? 'bg-gray-300 line-through text-gray-600' : 'bg-olivine bg-opacity-10 text-olivine'
                        }`}
                      >
                        {num}
                      </div>
                    );
                  })}
                </div>
                {/* N Column */}
                <div className="flex flex-col gap-1">
                  {Array.from({ length: 15 }, (_, i) => i + 31).map((num) => {
                    const ball = `N${num}`;
                    const isDrawn = drawnBalls.includes(ball);
                    return (
                      <div 
                        key={ball} 
                        className={`w-8 h-8 rounded flex items-center justify-center text-xs ${
                          isDrawn ? 'bg-gray-300 line-through text-gray-600' : 'bg-lilac bg-opacity-20 text-deep-sage'
                        }`}
                      >
                        {num}
                      </div>
                    );
                  })}
                </div>
                {/* G Column */}
                <div className="flex flex-col gap-1">
                  {Array.from({ length: 15 }, (_, i) => i + 46).map((num) => {
                    const ball = `G${num}`;
                    const isDrawn = drawnBalls.includes(ball);
                    return (
                      <div 
                        key={ball} 
                        className={`w-8 h-8 rounded flex items-center justify-center text-xs ${
                          isDrawn ? 'bg-gray-300 line-through text-gray-600' : 'bg-dahlia bg-opacity-10 text-dahlia'
                        }`}
                      >
                        {num}
                      </div>
                    );
                  })}
                </div>
                {/* O Column */}
                <div className="flex flex-col gap-1">
                  {Array.from({ length: 15 }, (_, i) => i + 61).map((num) => {
                    const ball = `O${num}`;
                    const isDrawn = drawnBalls.includes(ball);
                    return (
                      <div 
                        key={ball} 
                        className={`w-8 h-8 rounded flex items-center justify-center text-xs ${
                          isDrawn ? 'bg-gray-300 line-through text-gray-600' : 'bg-deep-sage bg-opacity-10 text-deep-sage'
                        }`}
                      >
                        {num}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* End Game Modal */}
        {showEndGameModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold text-deep-sage mb-4">Game Results</h2>
              
              <form onSubmit={finalizeGame}>
                <div className="mb-4">
                  <label className="block text-deep-sage mb-2" htmlFor="potAmount">
                    Total Pot Amount ($)
                  </label>
                  <input
                    id="potAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border rounded-md"
                    value={potAmount}
                    onChange={(e) => {
                      setPotAmount(e.target.value);
                      calculatePayouts(e.target.value, winnerCount);
                    }}
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-deep-sage mb-2" htmlFor="winnerCount">
                    Number of Winners
                  </label>
                  <input
                    id="winnerCount"
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border rounded-md"
                    value={winnerCount}
                    onChange={(e) => {
                      setWinnerCount(e.target.value);
                      calculatePayouts(potAmount, e.target.value);
                    }}
                    required
                  />
                </div>
                
                {winnerCount > 0 && (
                  <div className="mb-4">
                    <label className="block text-deep-sage mb-2" htmlFor="winnerName">
                      Winner Name(s)
                    </label>
                    <input
                      id="winnerName"
                      type="text"
                      className="w-full px-3 py-2 border rounded-md"
                      value={winnerName}
                      onChange={(e) => setWinnerName(e.target.value)}
                      placeholder={winnerCount > 1 ? "Enter multiple names separated by commas" : "Enter winner name"}
                      required
                    />
                  </div>
                )}
                
                {potAmount && winnerCount > 0 && (
                  <div className="mb-6 p-3 bg-lilac bg-opacity-20 rounded-md">
                    <p className="text-deep-sage font-medium">Payout Summary:</p>
                    <p className="text-deep-sage">
                      Calculated payout per winner: <span className="font-bold">${calculatedPayout.toFixed(2)}</span>
                    </p>
                    <p className="text-deep-sage">
                      Actual payout per winner (rounded up): <span className="font-bold">${actualPayout.toFixed(2)}</span>
                    </p>
                    <p className="text-deep-sage">
                      Total rounding loss: <span className="font-bold">${roundingLoss.toFixed(2)}</span>
                    </p>
                  </div>
                )}
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEndGameModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-dahlia text-white rounded-md"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save & End Game'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameView;
