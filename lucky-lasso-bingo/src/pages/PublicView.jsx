import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const PublicView = ({ 
  gameData = {}, 
  onUpdateGame 
}) => {
  // Get gameId from URL params
  const { gameId: urlGameId } = useParams();
  
  // Game state
  const [game, setGame] = useState(gameData);
  const [currentBall, setCurrentBall] = useState(null);
  const [lastBall, setLastBall] = useState(null);
  const [drawnBalls, setDrawnBalls] = useState([]);
  const [patternGrid, setPatternGrid] = useState([]);
  const [loadingPattern, setLoadingPattern] = useState(false);
  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState(null);
  const [activeGames, setActiveGames] = useState([]);
  const [loadingActiveGames, setLoadingActiveGames] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  
  // Fetch game by ID function - made reusable with useCallback
  const fetchGameById = useCallback(async (id) => {
    try {
      const gameDoc = await getDoc(doc(db, 'games', id));
      if (gameDoc.exists()) {
        const gameData = {
          id: gameDoc.id,
          ...gameDoc.data(),
          createdAt: gameDoc.data().createdAt?.toDate() || new Date()
        };
        setGame(gameData);
        setEventId(gameData.eventId); // Store the eventId for fetching active games
        setConnectionError(false);
        return gameData;
      }
      return null;
    } catch (error) {
      console.error('Error fetching game:', error);
      setConnectionError(true);
      return null;
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);
  
  // Determine which gameId to use - URL param takes precedence over prop
  useEffect(() => {
    setLoading(true);
    setConnectionError(false);

    // Determine which gameId to use
    const effectiveGameId = urlGameId || (gameData && gameData.id);
    
    if (!effectiveGameId) {
      setLoading(false);
      return;
    }
    
    // Fetch game data once on component mount
    const loadGameData = async () => {
      try {
        const gameData = await fetchGameById(effectiveGameId);
        
        if (gameData) {
          // Fetch pattern data if we have a patternId
          if (gameData.patternId) {
            await fetchPatternData(gameData.patternId);
          }
          
          // If game is completed, fetch active games from the same event
          if (gameData.status === 'completed') {
            await fetchActiveGames(gameData.eventId);
          }
          
          // Update drawn balls
          const updatedDrawnBalls = gameData.drawnBalls || [];
          setDrawnBalls(updatedDrawnBalls);
          
          // Set current and last ball
          if (updatedDrawnBalls.length > 0) {
            setCurrentBall(updatedDrawnBalls[updatedDrawnBalls.length - 1]);
            setLastBall(updatedDrawnBalls.length > 1 ? updatedDrawnBalls[updatedDrawnBalls.length - 2] : null);
          }
        }
      } catch (error) {
        console.error('Error loading game data:', error);
        setConnectionError(true);
      } finally {
        setLoading(false);
      }
    };
    
    loadGameData();
  }, [urlGameId, gameData?.id, fetchGameById]);
  
  // Fetch pattern data from Firestore
  const fetchPatternData = async (patternId) => {
    setLoadingPattern(true);
    try {
      // Check if it's a custom pattern or a predefined one
      if (['horizontal', 'vertical', 'diagonal', 'corners', 'blackout', 'x_pattern'].includes(patternId)) {
        // Use predefined pattern
        const predefinedPatterns = {
          'horizontal': [
            [false, false, false, false, false],
            [false, false, false, false, false],
            [true, true, true, true, true],
            [false, false, false, false, false],
            [false, false, false, false, false]
          ],
          'vertical': [
            [false, false, true, false, false],
            [false, false, true, false, false],
            [false, false, true, false, false],
            [false, false, true, false, false],
            [false, false, true, false, false]
          ],
          'diagonal': [
            [true, false, false, false, false],
            [false, true, false, false, false],
            [false, false, true, false, false],
            [false, false, false, true, false],
            [false, false, false, false, true]
          ],
          'corners': [
            [true, false, false, false, true],
            [false, false, false, false, false],
            [false, false, false, false, false],
            [false, false, false, false, false],
            [true, false, false, false, true]
          ],
          'blackout': [
            [true, true, true, true, true],
            [true, true, true, true, true],
            [true, true, true, true, true],
            [true, true, true, true, true],
            [true, true, true, true, true]
          ],
          'x_pattern': [
            [true, false, false, false, true],
            [false, true, false, true, false],
            [false, false, true, false, false],
            [false, true, false, true, false],
            [true, false, false, false, true]
          ]
        };
        
        setPatternGrid(predefinedPatterns[patternId] || []);
        setConnectionError(false);
      } else {
        // Fetch custom pattern from Firestore
        const patternDoc = await getDoc(doc(db, 'patterns', patternId));
        
        if (patternDoc.exists()) {
          const patternData = patternDoc.data();
          
          // Convert the flat grid to 2D array
          if (patternData.grid && Array.isArray(patternData.grid)) {
            const grid = [];
            for (let i = 0; i < 5; i++) {
              const row = [];
              for (let j = 0; j < 5; j++) {
                row.push(patternData.grid[i * 5 + j]);
              }
              grid.push(row);
            }
            setPatternGrid(grid);
            setConnectionError(false);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching pattern data:', error);
      setConnectionError(true);
    } finally {
      setLoadingPattern(false);
    }
  };
  
  // Ball color helper
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
  
  // Function to fetch active games from the same event
  const fetchActiveGames = async (eventId) => {
    if (!eventId) return;
    
    setLoadingActiveGames(true);
    try {
      // Query for games that are in progress or paused
      const activeGamesQuery = query(
        collection(db, 'games'),
        where('eventId', '==', eventId),
        where('status', 'in', ['in_progress', 'paused', 'ready']),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(activeGamesQuery);
      const gamesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      
      setActiveGames(gamesList);
      setConnectionError(false);
      
      // If we have active games and the current game is completed,
      // automatically switch to the most recent active game
      if (gamesList.length > 0 && game?.status === 'completed') {
        const mostRecentGame = gamesList[0];
        if (mostRecentGame.id !== game.id) {
          // Update the URL without refreshing the page
          window.history.pushState({}, '', `/public/${mostRecentGame.id}`);
          
          // Set the new game data
          setGame(mostRecentGame);
          setDrawnBalls(mostRecentGame.drawnBalls || []);
          
          // Update current and last ball
          const updatedDrawnBalls = mostRecentGame.drawnBalls || [];
          if (updatedDrawnBalls.length > 0) {
            setCurrentBall(updatedDrawnBalls[updatedDrawnBalls.length - 1]);
            setLastBall(updatedDrawnBalls.length > 1 ? updatedDrawnBalls[updatedDrawnBalls.length - 2] : null);
          } else {
            setCurrentBall(null);
            setLastBall(null);
          }
          
          // Fetch pattern data if we have a patternId
          if (mostRecentGame.patternId) {
            fetchPatternData(mostRecentGame.patternId);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching active games:', error);
    } finally {
      setLoadingActiveGames(false);
    }
  };
  
  // Handle manual game switch
  const handleNextGame = async () => {
    if (!eventId) return;
    
    try {
      await fetchActiveGames(eventId);
      
      if (activeGames.length > 0) {
        const nextGame = activeGames[0];
        
        // Update the URL without refreshing the page
        window.history.pushState({}, '', `/public/${nextGame.id}`);
        
        // Set the new game data
        setGame(nextGame);
        setDrawnBalls(nextGame.drawnBalls || []);
        
        // Update current and last ball
        const updatedDrawnBalls = nextGame.drawnBalls || [];
        if (updatedDrawnBalls.length > 0) {
          setCurrentBall(updatedDrawnBalls[updatedDrawnBalls.length - 1]);
          setLastBall(updatedDrawnBalls.length > 1 ? updatedDrawnBalls[updatedDrawnBalls.length - 2] : null);
        } else {
          setCurrentBall(null);
          setLastBall(null);
        }
        
        // Fetch pattern data if we have a patternId
        if (nextGame.patternId) {
          fetchPatternData(nextGame.patternId);
        }
        
        setConnectionError(false);
      }
    } catch (error) {
      console.error('Error switching to next game:', error);
      setConnectionError(true);
    }
  };
  
  // Handle manual retry
  const handleRetry = () => {
    setRetrying(true);
    const effectiveGameId = urlGameId || (gameData && gameData.id);
    if (effectiveGameId) {
      fetchGameById(effectiveGameId);
    } else {
      setRetrying(false);
      setLoading(false);
    }
  };
  
  // Handle manual refresh of game data
  const refreshGame = async () => {
    setLoading(true);
    try {
      const effectiveGameId = urlGameId || (gameData && gameData.id);
      
      if (effectiveGameId) {
        const gameData = await fetchGameById(effectiveGameId);
        
        if (gameData) {
          // Fetch pattern data if we have a patternId
          if (gameData.patternId) {
            await fetchPatternData(gameData.patternId);
          }
          
          // Update drawn balls
          const updatedDrawnBalls = gameData.drawnBalls || [];
          setDrawnBalls(updatedDrawnBalls);
          
          // Set current and last ball
          if (updatedDrawnBalls.length > 0) {
            setCurrentBall(updatedDrawnBalls[updatedDrawnBalls.length - 1]);
            setLastBall(updatedDrawnBalls.length > 1 ? updatedDrawnBalls[updatedDrawnBalls.length - 2] : null);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing game data:', error);
      setConnectionError(true);
    } finally {
      setLoading(false);
    }
  };

  // If loading, show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-deep-sage text-xl">Loading game data...</p>
      </div>
    );
  }
  
  // If connection error, show error state with retry button
  if (connectionError) {
    return (
      <div className="min-h-screen bg-ivory flex flex-col items-center justify-center gap-4">
        <p className="text-deep-sage text-xl">Connection error. Unable to load game data.</p>
        <button 
          onClick={handleRetry}
          disabled={retrying}
          className="px-4 py-2 bg-bluebell text-white rounded-md hover:bg-opacity-90 transition-colors"
        >
          {retrying ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    );
  }
  
  // If no game data, show error state
  if (!game || !game.eventName) {
    return (
      <div className="min-h-screen bg-ivory flex flex-col items-center justify-center gap-4">
        <p className="text-deep-sage text-xl">Waiting for game data...</p>
        <button 
          onClick={handleRetry}
          disabled={retrying}
          className="px-4 py-2 bg-bluebell text-white rounded-md hover:bg-opacity-90 transition-colors"
        >
          {retrying ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-ivory p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold text-deep-sage text-center">
            {game.eventName} - Game #{game.gameNumber}
          </h1>
          
          <div className="flex gap-2">
            {/* Refresh Game button */}
            <button
              onClick={refreshGame}
              disabled={loading}
              className="px-4 py-2 bg-olivine text-white rounded-md hover:bg-opacity-90 transition-colors"
            >
              {loading ? 'Refreshing...' : 'Refresh Game'}
            </button>
            
            {/* Next Game button */}
            <button
              onClick={handleNextGame}
              disabled={loadingActiveGames}
              className="px-4 py-2 bg-bluebell text-white rounded-md hover:bg-opacity-90 transition-colors"
            >
              {loadingActiveGames ? 'Loading...' : 'Next Game'}
            </button>
          </div>
        </div>
        
        {/* Winner Information Banner - Show when game is completed */}
        {game.status === 'completed' && game.winnerCount > 0 && (
          <div className="bg-olivine bg-opacity-20 p-4 rounded-lg mb-4 text-center">
            <h2 className="text-xl font-bold text-deep-sage mb-2">Game Results</h2>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="bg-white rounded-lg shadow-sm p-3 min-w-[120px]">
                <p className="text-sm text-gray-600">Total Pot</p>
                <p className="text-lg font-semibold text-deep-sage">${game.potAmount?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-3 min-w-[120px]">
                <p className="text-sm text-gray-600">Winners</p>
                <p className="text-lg font-semibold text-deep-sage">{game.winnerCount}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-3 min-w-[120px]">
                <p className="text-sm text-gray-600">Payout Per Winner</p>
                <p className="text-lg font-semibold text-deep-sage">${game.actualPayoutPerWinner?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Ball Display Row - Current Ball, Last Ball, Pattern, and Balls Drawn */}
        <div className="flex flex-row justify-center gap-4 mb-6 w-full">
          {/* Current Ball - 30% */}
          <div className="bg-white rounded-lg shadow-md p-4 text-center w-full md:w-[28%]">
            <h2 className="text-xl font-semibold text-deep-sage mb-4">Current Ball</h2>
            <div 
              className={`mx-auto w-48 h-48 rounded-full flex items-center justify-center text-6xl font-bold text-white ${
                currentBall ? getBallColor(currentBall) : 'bg-gray-300'
              }`}
            >
              {currentBall || '?'}
            </div>
          </div>
          
          {/* Last Ball - 20% */}
          {lastBall && (
            <div className="bg-white rounded-lg shadow-md p-4 text-center w-full md:w-[18%]">
              <h2 className="text-lg font-semibold text-deep-sage mb-4">Last Ball</h2>
              <div 
                className={`mx-auto w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold text-white ${getBallColor(lastBall)}`}
              >
                {lastBall}
              </div>
            </div>
          )}
          
          {/* Pattern Display - 35% */}
          <div className="bg-white rounded-lg shadow-md p-4 text-center w-full md:w-[33%]">
            <h2 className="text-lg font-semibold text-deep-sage mb-4">Pattern: {game.patternName}</h2>
            {patternGrid.length > 0 ? (
              <div className="mx-auto">
                <div className="grid grid-cols-5 gap-1 mb-2 mx-auto max-w-[150px]">
                  {['B', 'I', 'N', 'G', 'O'].map((letter) => (
                    <div 
                      key={letter} 
                      className="h-6 flex items-center justify-center font-bold rounded text-white bg-deep-sage text-xs"
                    >
                      {letter}
                    </div>
                  ))}
                  
                  {patternGrid.map((row, rowIndex) => (
                    row.map((cell, colIndex) => {
                      const isFreeSpace = rowIndex === 2 && colIndex === 2;
                      
                      return (
                        <div 
                          key={`${rowIndex}-${colIndex}`}
                          className={`h-6 w-6 rounded flex items-center justify-center text-center ${
                            isFreeSpace
                              ? 'bg-lilac bg-opacity-30 text-deep-sage font-bold text-xs'
                              : cell
                                ? 'bg-olivine'
                                : 'bg-gray-200'
                          }`}
                        >
                          {isFreeSpace ? 'F' : ''}
                        </div>
                      );
                    })
                  ))}
                </div>
              </div>
            ) : loadingPattern ? (
              <div className="mx-auto w-32 h-32 flex items-center justify-center">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : (
              <div className="mx-auto w-32 h-32 flex items-center justify-center">
                <p className="text-gray-500">No pattern available</p>
              </div>
            )}
          </div>
          
          {/* Balls Drawn Counter - 15% */}
          <div className="bg-white rounded-lg shadow-md p-4 text-center w-full md:w-[14%]">
            <h2 className="text-lg font-semibold text-deep-sage mb-4">Balls Drawn</h2>
            <div className="mx-auto w-32 h-32 flex items-center justify-center">
              <div className="text-4xl font-bold text-deep-sage">
                {drawnBalls.length}
                <span className="text-xl block mt-2">of 75</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Ball Board Row - Full width */}
        <div className="bg-white rounded-lg shadow-md p-4 w-full">
            <h2 className="text-xl font-semibold text-deep-sage text-center mb-4">Bingo Ball Board</h2>
            
            {/* Ball Board Table Layout */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {/* Create header with B, I, N, G, O each spanning 3 columns */}
                    {['B', 'I', 'N', 'G', 'O'].map((letter) => (
                      <th 
                        key={letter}
                        className="text-center font-bold text-xl text-white py-2 px-4 w-12 h-12"
                        colSpan="3"
                        style={{
                          backgroundColor: {
                            'B': '#5b7fbd', // Bluebell
                            'I': '#b5a33a', // Olivine
                            'N': '#dbc3db', // Lilac
                            'G': '#fe6232', // Dahlia
                            'O': '#5d6d58'  // Deep Sage
                          }[letter]
                        }}
                      >
                        {letter}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Create 5 rows with 15 columns each */}
                  {Array.from({ length: 5 }, (_, rowIndex) => {
                    return (
                      <tr key={rowIndex} className="border-b border-gray-200">
                        {/* Generate all 15 columns (3 columns for each of the 5 letters) */}
                        {Array.from({ length: 15 }, (_, colIndex) => {
                          // Calculate the ball number based on the new layout
                          // For each letter (B,I,N,G,O), we have 3 columns and 5 rows
                          const letterIndex = Math.floor(colIndex / 3); // Which letter group (0-4 for B,I,N,G,O)
                          const letterOffset = colIndex % 3; // Which column within the letter group (0-2)
                          
                          // Calculate the actual number (1-75)
                          const num = rowIndex + 1 + (letterOffset * 5) + (letterIndex * 15);
                          
                          // Get the corresponding letter
                          const letter = ['B', 'I', 'N', 'G', 'O'][letterIndex];
                          
                          const ball = `${letter}${num}`;
                          const isDrawn = drawnBalls.includes(ball);
                          
                          return (
                            <td 
                              key={ball} 
                              className={`
                                text-center text-lg sm:text-xl font-bold p-2 border border-gray-200
                                w-12 h-12
                                ${isDrawn 
                                  ? 'bg-gray-300 text-gray-600 line-through' 
                                  : 'bg-gray-100 text-deep-sage'
                                }
                              `}
                            >
                              {num}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        </div>
  );
};

export default PublicView;