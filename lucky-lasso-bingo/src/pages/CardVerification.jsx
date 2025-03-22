import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/layout/Header';

const CardVerification = () => {
  const navigate = useNavigate();
  
  // Verification states
  const [step, setStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [cardNumbers, setCardNumbers] = useState(Array(25).fill(''));
  const [loading, setLoading] = useState(false);
  const [gameData, setGameData] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  
  // Recent games for quick selection
  const [recentGames, setRecentGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  
  // Load recent games for quick selection
  useEffect(() => {
    const fetchRecentGames = async () => {
      try {
        // Get active games first
        const activeGamesQuery = query(
          collection(db, 'games'),
          where('status', 'in', ['ready', 'in_progress']),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        
        const activeGamesSnapshot = await getDocs(activeGamesQuery);
        const activeGames = activeGamesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }));
        
        setRecentGames(activeGames);
      } catch (error) {
        console.error('Error fetching recent games:', error);
      } finally {
        setLoadingGames(false);
      }
    };
    
    fetchRecentGames();
  }, []);
  
  // Look up game by verification code
  const handleVerificationCodeSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const gamesQuery = query(
        collection(db, 'games'),
        where('verificationCode', '==', verificationCode.toUpperCase().trim())
      );
      
      const querySnapshot = await getDocs(gamesQuery);
      
      if (querySnapshot.empty) {
        setError('No game found with this verification code. Please check and try again.');
        setLoading(false);
        return;
      }
      
      const gameDoc = querySnapshot.docs[0];
      const gameData = {
        id: gameDoc.id,
        ...gameDoc.data(),
        createdAt: gameDoc.data().createdAt?.toDate() || new Date()
      };
      
      setGameData(gameData);
      setStep(2);
    } catch (err) {
      console.error('Error looking up game:', err);
      setError('Failed to verify game code. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle selecting a card number
  const handleCardNumberChange = (index, value) => {
    const newCardNumbers = [...cardNumbers];
    newCardNumbers[index] = value;
    setCardNumbers(newCardNumbers);
  };
  
  // Verify the card
  const handleCardVerification = (e) => {
    e.preventDefault();
    
    if (!gameData) {
      setError('Game data not found. Please go back and re-enter the verification code.');
      return;
    }
    
    const drawnBalls = gameData.drawnBalls || [];
    const patternType = gameData.patternType || 'horizontal';
    
    // Check which numbers on the card have been called
    const markedPositions = Array(25).fill(false);
    
    // Mark the free space in the middle
    markedPositions[12] = true;
    
    // Check each number on the card
    cardNumbers.forEach((number, index) => {
      if (index === 12 || !number) return; // Skip free space and empty cells
      
      // Determine the letter based on column
      const col = index % 5;
      let letter;
      
      switch (col) {
        case 0: letter = 'B'; break;
        case 1: letter = 'I'; break;
        case 2: letter = 'N'; break;
        case 3: letter = 'G'; break;
        case 4: letter = 'O'; break;
        default: letter = ''; break;
      }
      
      const ball = `${letter}${number}`;
      
      // Check if this ball has been drawn
      if (drawnBalls.includes(ball)) {
        markedPositions[index] = true;
      }
    });
    
    // Check for winning pattern
    let isWinner = false;
    
    switch (patternType) {
      case 'horizontal':
        // Check horizontal lines
        for (let row = 0; row < 5; row++) {
          const rowStart = row * 5;
          const hasWinningRow = markedPositions[rowStart] &&
            markedPositions[rowStart + 1] &&
            markedPositions[rowStart + 2] &&
            markedPositions[rowStart + 3] &&
            markedPositions[rowStart + 4];
          
          if (hasWinningRow) {
            isWinner = true;
            break;
          }
        }
        break;
        
      case 'vertical':
        // Check vertical lines
        for (let col = 0; col < 5; col++) {
          const hasWinningCol = markedPositions[col] &&
            markedPositions[col + 5] &&
            markedPositions[col + 10] &&
            markedPositions[col + 15] &&
            markedPositions[col + 20];
          
          if (hasWinningCol) {
            isWinner = true;
            break;
          }
        }
        break;
        
      case 'diagonal':
        // Check diagonals
        const hasDiagonal1 = markedPositions[0] &&
          markedPositions[6] &&
          markedPositions[12] &&
          markedPositions[18] &&
          markedPositions[24];
        
        const hasDiagonal2 = markedPositions[4] &&
          markedPositions[8] &&
          markedPositions[12] &&
          markedPositions[16] &&
          markedPositions[20];
        
        if (hasDiagonal1 || hasDiagonal2) {
          isWinner = true;
        }
        break;
        
      case 'corners':
        // Check four corners
        isWinner = markedPositions[0] &&
          markedPositions[4] &&
          markedPositions[20] &&
          markedPositions[24];
        break;
        
      case 'blackout':
        // Check if all positions are marked
        isWinner = markedPositions.every(marked => marked);
        break;
        
      default:
        // Default to checking horizontal lines
        for (let row = 0; row < 5; row++) {
          const rowStart = row * 5;
          const hasWinningRow = markedPositions[rowStart] &&
            markedPositions[rowStart + 1] &&
            markedPositions[rowStart + 2] &&
            markedPositions[rowStart + 3] &&
            markedPositions[rowStart + 4];
          
          if (hasWinningRow) {
            isWinner = true;
            break;
          }
        }
    }
    
    // Set the result
    setResult({
      isWinner,
      markedPositions,
      gameData,
      pattern: patternType
    });
    
    // Move to the results step
    setStep(3);
  };
  
  // Reset the verification
  const handleReset = () => {
    setVerificationCode('');
    setCardNumbers(Array(25).fill(''));
    setGameData(null);
    setResult(null);
    setError(null);
    setStep(1);
  };
  
  // Select a recent game
  const handleSelectRecentGame = (game) => {
    setVerificationCode(game.verificationCode);
    setGameData(game);
    setStep(2);
  };

  // Render the verification code entry form
  const renderStep1 = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-deep-sage mb-4">Card Verification</h2>
      <p className="mb-4 text-deep-sage">
        Enter the verification code for the current game to begin verification.
      </p>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleVerificationCodeSubmit}>
        <div className="mb-4">
          <label htmlFor="verificationCode" className="block text-deep-sage mb-2">
            Verification Code
          </label>
          <input
            id="verificationCode"
            type="text"
            className="w-full p-3 border rounded-md text-center text-xl font-mono"
            placeholder="Enter code (e.g. ABC123)"
            value={verificationCode}
            onChange={e => setVerificationCode(e.target.value.toUpperCase())}
            required
          />
        </div>
        
        <button
          type="submit"
          className="w-full py-2 px-4 bg-bluebell text-white rounded-md"
          disabled={loading}
        >
          {loading ? 'Verifying...' : 'Continue'}
        </button>
      </form>
      
      {!loadingGames && recentGames.length > 0 && (
        <div className="mt-6">
          <h3 className="text-md font-bold text-deep-sage mb-2">Recent Active Games</h3>
          
          <div className="space-y-2">
            {recentGames.map(game => (
              <button
                key={game.id}
                onClick={() => handleSelectRecentGame(game)}
                className="w-full p-3 border rounded-md text-left hover:bg-ivory transition-colors"
              >
                <div className="font-medium text-deep-sage">{game.eventName} - Game #{game.gameNumber}</div>
                <div className="text-sm text-gray-600">
                  <span className="font-mono">{game.verificationCode}</span> • Pattern: {game.patternName}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
  
  // Render the card entry form
  const renderStep2 = () => {
    const bingoLetters = ['B', 'I', 'N', 'G', 'O'];
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-deep-sage mb-4">Enter Card Numbers</h2>
        <p className="mb-4 text-deep-sage">
          Enter the numbers on the player's bingo card. The center square is a free space.
        </p>
        
        {gameData && (
          <div className="mb-4 p-3 bg-lilac bg-opacity-20 rounded-md">
            <p className="text-deep-sage font-medium">Verifying for:</p>
            <p className="text-deep-sage">{gameData.eventName} - Game #{gameData.gameNumber}</p>
            <p className="text-deep-sage">Pattern: {gameData.patternName}</p>
          </div>
        )}
        
        <form onSubmit={handleCardVerification}>
          <div className="mb-6">
            <div className="grid grid-cols-5 gap-2">
              {/* Column Headers */}
              {bingoLetters.map((letter, idx) => (
                <div 
                  key={letter} 
                  className="h-10 flex items-center justify-center font-bold rounded text-white bg-deep-sage"
                >
                  {letter}
                </div>
              ))}
              
              {/* Card Input Grid */}
              {Array(25).fill(0).map((_, index) => {
                const row = Math.floor(index / 5);
                const col = index % 5;
                const isFreeSpace = index === 12; // Center space
                
                // Determine the valid range for this column
                let min, max;
                switch(col) {
                  case 0: min = 1; max = 15; break;  // B column
                  case 1: min = 16; max = 30; break; // I column
                  case 2: min = 31; max = 45; break; // N column
                  case 3: min = 46; max = 60; break; // G column
                  case 4: min = 61; max = 75; break; // O column
                  default: min = 1; max = 75;
                }
                
                return (
                  <div key={index} className="h-12">
                    {isFreeSpace ? (
                      <div 
                        className="h-full w-full flex items-center justify-center bg-lilac bg-opacity-30 font-medium text-deep-sage"
                      >
                        FREE
                      </div>
                    ) : (
                      <input
                        type="number"
                        min={min}
                        max={max}
                        value={cardNumbers[index]}
                        onChange={(e) => handleCardNumberChange(index, e.target.value)}
                        className="h-full w-full text-center border rounded-sm"
                        placeholder={`${min}-${max}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            
            <p className="text-sm text-gray-600 mt-2">
              Enter numbers in the valid range for each column:
              B (1-15), I (16-30), N (31-45), G (46-60), O (61-75)
            </p>
          </div>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="py-2 px-4 border border-gray-300 rounded-md"
            >
              Back
            </button>
            
            <button
              type="submit"
              className="py-2 px-4 bg-bluebell text-white rounded-md"
            >
              Verify Card
            </button>
          </div>
        </form>
      </div>
    );
  };
  
  // Render the results
  const renderStep3 = () => {
    if (!result) return null;
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-deep-sage mb-4">Verification Result</h2>
        
        <div className={`p-4 rounded-md mb-6 ${
          result.isWinner 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {result.isWinner ? (
            <div className="flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="font-bold">WINNER!</span>
            </div>
          ) : (
            <div className="flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              <span className="font-bold">NOT A WINNER</span>
            </div>
          )}
          
          <p className="mt-2">
            {result.isWinner 
              ? 'This card has a valid winning pattern for the current game!' 
              : 'This card does not have a valid winning pattern for the current game.'}
          </p>
        </div>
        
        <div className="mb-6">
          <h3 className="text-md font-bold text-deep-sage mb-2">Card Validation</h3>
          
          <div className="grid grid-cols-5 gap-2">
            {['B', 'I', 'N', 'G', 'O'].map((letter, idx) => (
              <div 
                key={letter} 
                className="h-10 flex items-center justify-center font-bold rounded text-white bg-deep-sage"
              >
                {letter}
              </div>
            ))}
            
            {cardNumbers.map((number, index) => {
              const isMarked = result.markedPositions[index];
              const isFreeSpace = index === 12;
              
              return (
                <div 
                  key={index} 
                  className={`h-12 flex items-center justify-center rounded ${
                    isFreeSpace 
                      ? 'bg-lilac bg-opacity-30 text-deep-sage font-medium' 
                      : isMarked 
                        ? 'bg-green-100 border border-green-400 text-green-700 font-bold' 
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isFreeSpace ? 'FREE' : number}
                </div>
              );
            })}
          </div>
          
          <p className="text-sm text-gray-600 mt-2">
            <span className="font-medium">Pattern: </span>
            {result.gameData.patternName}
          </p>
        </div>
        
        <div className="flex justify-between">
          <button
            onClick={handleReset}
            className="py-2 px-4 border border-gray-300 rounded-md"
          >
            Verify Another Card
          </button>
          
          <button
            onClick={() => navigate('/game/' + result.gameData.id)}
            className="py-2 px-4 bg-bluebell text-white rounded-md"
          >
            Return to Game
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-ivory">
      <Header title="Card Verification" />
      
      <main className="container mx-auto p-4">
        <div className="max-w-2xl mx-auto">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>
      </main>
    </div>
  );
};

export default CardVerification;