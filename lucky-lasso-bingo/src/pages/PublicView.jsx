import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const PublicView = ({ 
  gameData = {}, 
  onUpdateGame 
}) => {
  // Game state
  const [game, setGame] = useState(gameData);
  const [currentBall, setCurrentBall] = useState(null);
  const [lastBall, setLastBall] = useState(null);
  const [drawnBalls, setDrawnBalls] = useState([]);
  const [patternGrid, setPatternGrid] = useState([]);
  const [loadingPattern, setLoadingPattern] = useState(false);
  
  // Update game data when prop changes
  useEffect(() => {
    if (gameData) {
      setGame(gameData);
      
      // Update drawn balls
      const updatedDrawnBalls = gameData.drawnBalls || [];
      setDrawnBalls(updatedDrawnBalls);
      
      // Set current and last ball
      if (updatedDrawnBalls.length > 0) {
        setCurrentBall(updatedDrawnBalls[updatedDrawnBalls.length - 1]);
        setLastBall(updatedDrawnBalls.length > 1 ? updatedDrawnBalls[updatedDrawnBalls.length - 2] : null);
      }
      
      // Fetch pattern data if we have a patternId
      if (gameData.patternId) {
        fetchPatternData(gameData.patternId);
      }
    }
  }, [gameData]);
  
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
          }
        }
      }
    } catch (error) {
      console.error('Error fetching pattern data:', error);
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
  
  // If no game data, show loading or error state
  if (!game || !game.eventName) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-deep-sage text-xl">Waiting for game data...</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-ivory p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-deep-sage text-center mb-2">
          {game.eventName} - Game #{game.gameNumber}
        </h1>
        
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