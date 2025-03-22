import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/layout/Header';

const GameSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const eventId = queryParams.get('event');
  
  const [eventDetails, setEventDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Game setup state
  const [gameNumber, setGameNumber] = useState('');
  const [patternType, setPatternType] = useState('');
  const [patternId, setPatternId] = useState('');
  const [prize, setPrize] = useState('');
  const [creating, setCreating] = useState(false);
  const [existingGames, setExistingGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [isNewGame, setIsNewGame] = useState(true);
  
  // Pattern state
  const [patterns, setPatterns] = useState([]);
  const [loadingPatterns, setLoadingPatterns] = useState(true);
  
  // Default predefined patterns
  const defaultPatterns = [
    { id: 'horizontal', name: 'Horizontal Line', description: 'Any complete horizontal line' },
    { id: 'vertical', name: 'Vertical Line', description: 'Any complete vertical line' },
    { id: 'diagonal', name: 'Diagonal Line', description: 'Any complete diagonal line' },
    { id: 'corners', name: 'Four Corners', description: 'All four corners marked' },
    { id: 'blackout', name: 'Blackout', description: 'All squares marked' }
  ];
  
  // Fetch event details and unstarted games
  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!eventId) {
        setError('No event specified');
        setLoading(false);
        return;
      }
      
      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        
        if (eventDoc.exists()) {
          const eventData = {
            id: eventDoc.id,
            ...eventDoc.data(),
            date: eventDoc.data().date instanceof Date 
              ? eventDoc.data().date 
              : eventDoc.data().date.toDate()
          };
          
          setEventDetails(eventData);
          
          // Fetch unstarted games for this event
          const gamesQuery = query(
            collection(db, 'games'),
            where('eventId', '==', eventId),
            where('status', '==', 'ready')
          );
          
          const gamesSnapshot = await getDocs(gamesQuery);
          const unstartedGames = gamesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setExistingGames(unstartedGames);
          
          // Set default game number based on previous games
          setGameNumber(String(unstartedGames.length + 1));
        } else {
          setError('Event not found');
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEventDetails();
  }, [eventId]);
  
  // Fetch patterns (both default and custom)
  useEffect(() => {
    const fetchPatterns = async () => {
      try {
        // Get custom patterns from Firestore
        const patternsQuery = collection(db, 'patterns');
        const querySnapshot = await getDocs(patternsQuery);
        
        const customPatterns = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          isCustom: true
        }));
        
        // Combine default and custom patterns
        const allPatterns = [...defaultPatterns, ...customPatterns];
        
        setPatterns(allPatterns);
        
        // Set default pattern if there are patterns available
        if (allPatterns.length > 0) {
          setPatternType(allPatterns[0].id);
          setPatternId(allPatterns[0].id);
        }
      } catch (err) {
        console.error('Error fetching patterns:', err);
      } finally {
        setLoadingPatterns(false);
      }
    };
    
    fetchPatterns();
  }, [defaultPatterns]);
  
  // Create a new game
  const handleCreateGame = async (e) => {
    e.preventDefault();
    setCreating(true);
    
    try {
      // Find the selected pattern
      const selectedPattern = patterns.find(p => p.id === patternType || p.id === patternId);
      
      if (!selectedPattern) {
        throw new Error('Selected pattern not found');
      }
      
      // Create a unique verification code
      const verificationCode = generateVerificationCode();
      
      // Create the game document
      const gameData = {
        eventId,
        eventName: eventDetails.name,
        gameNumber: parseInt(gameNumber),
        patternType: selectedPattern.isCustom ? 'custom' : patternType,
        patternId: selectedPattern.id,
        patternName: selectedPattern.name,
        patternDescription: selectedPattern.description,
        prize,
        verificationCode,
        status: 'ready',
        drawnBalls: [],
        createdAt: serverTimestamp()
      };
      
      const gameRef = await addDoc(collection(db, 'games'), gameData);
      console.log('Game created with ID:', gameRef.id);
      
      // Navigate to the game view
      navigate(`/game/${gameRef.id}`);
    } catch (err) {
      console.error('Error creating game:', err);
      setError('Failed to create game');
      setCreating(false);
    }
  };
  
  // Generate a simple verification code
  const generateVerificationCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };
  
  // Handle pattern selection
  const handlePatternChange = (e) => {
    setPatternType(e.target.value);
    setPatternId(e.target.value);
  };
  
  if (loading || loadingPatterns) {
    return (
      <div className="min-h-screen bg-ivory">
        <Header title="Game Setup" />
        <div className="max-w-7xl mx-auto p-6 text-center">
          <p className="text-deep-sage">Loading...</p>
        </div>
      </div>
    );
  }

  const handleGameSelection = (game) => {
    setSelectedGame(game);
    setIsNewGame(false);
    setGameNumber(String(game.gameNumber));
    setPatternType(game.patternId);
    setPatternId(game.patternId);
    setPrize(game.prize);
  };

  const handleNewGameClick = () => {
    setSelectedGame(null);
    setIsNewGame(true);
    setGameNumber(String(existingGames.length + 1));
    setPatternType(patterns[0]?.id || '');
    setPatternId(patterns[0]?.id || '');
    setPrize('');
  };

  const renderGameSelection = () => (
    <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-deep-sage mb-4">Select Game</h2>
      <div className="flex space-x-4 mb-6">
        <button
          onClick={handleNewGameClick}
          className={`px-4 py-2 rounded ${isNewGame ? 'bg-bluebell text-white' : 'bg-gray-200 text-deep-sage'}`}
        >
          Create New Game
        </button>
        {existingGames.length > 0 && (
          <button
            onClick={() => setIsNewGame(false)}
            className={`px-4 py-2 rounded ${!isNewGame ? 'bg-bluebell text-white' : 'bg-gray-200 text-deep-sage'}`}
          >
            Use Existing Game
          </button>
        )}
      </div>

      {!isNewGame && existingGames.length > 0 && (
        <div className="grid gap-4">
          {existingGames.map((game) => (
            <div
              key={game.id}
              onClick={() => handleGameSelection(game)}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedGame?.id === game.id ? 'border-bluebell bg-bluebell bg-opacity-10' : 'border-gray-200 hover:border-bluebell'}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-deep-sage">Game {game.gameNumber}</h3>
                  <p className="text-sm text-gray-600">{game.patternName}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-olivine">{game.prize}</p>
                  <p className="text-xs text-gray-500">Ready to start</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
  
  if (error) {
    return (
      <div className="min-h-screen bg-ivory">
        <Header title="Game Setup" />
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
      <Header title="Game Setup" />
      <div className="max-w-7xl mx-auto p-6">
        {renderGameSelection()}
        {isNewGame ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-deep-sage mb-4">Create New Game</h2>
            <form onSubmit={handleCreateGame}>
              <div className="grid gap-4">
                <div>
                  <label className="block text-deep-sage font-medium mb-2">Game Number</label>
                  <input
                    type="number"
                    value={gameNumber}
                    onChange={(e) => setGameNumber(e.target.value)}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-bluebell"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-deep-sage font-medium mb-2">Pattern</label>
                  <select
                    value={patternType}
                    onChange={handlePatternChange}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-bluebell"
                    required
                  >
                    {patterns.map(pattern => (
                      <option key={pattern.id} value={pattern.id}>
                        {pattern.name} {pattern.difficulty ? `(Difficulty: ${pattern.difficulty})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-deep-sage font-medium mb-2">Prize</label>
                  <input
                    type="text"
                    value={prize}
                    onChange={(e) => setPrize(e.target.value)}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-bluebell"
                    placeholder="e.g. $50"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-bluebell text-white py-2 px-4 rounded hover:bg-opacity-90 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Game'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-deep-sage mb-4">Start Existing Game</h2>
            {selectedGame ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-deep-sage">Selected Game Details</h3>
                  <p className="text-gray-600">Game {selectedGame.gameNumber}</p>
                  <p className="text-gray-600">Pattern: {selectedGame.patternName}</p>
                  <p className="text-gray-600">Prize: {selectedGame.prize}</p>
                </div>
                <button
                  onClick={() => navigate(`/game/${selectedGame.id}`)}
                  className="w-full bg-bluebell text-white py-2 px-4 rounded hover:bg-opacity-90"
                >
                  Start Game
                </button>
              </div>
            ) : (
              <p className="text-gray-600">Please select a game from the list above</p>
            )}
          </div>
        )}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-deep-sage mb-4">Start New Game</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-deep-sage mb-2">Event Details</h3>
            <p><span className="font-medium">Event:</span> {eventDetails.name}</p>
            <p><span className="font-medium">Location:</span> {eventDetails.location}</p>
            <p><span className="font-medium">Date:</span> {eventDetails.date.toLocaleDateString()}</p>
          </div>
          
          <form onSubmit={handleCreateGame}>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-deep-sage mb-2" htmlFor="gameNumber">
                  Game Number
                </label>
                <input
                  id="gameNumber"
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border rounded-md"
                  value={gameNumber}
                  onChange={(e) => setGameNumber(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-deep-sage mb-2" htmlFor="patternType">
                  Bingo Pattern
                </label>
                <select
                  id="patternType"
                  className="w-full px-3 py-2 border rounded-md"
                  value={patternId || patternType}
                  onChange={handlePatternChange}
                  required
                >
                  <optgroup label="Standard Patterns">
                    {patterns.filter(p => !p.isCustom).map((pattern) => (
                      <option key={pattern.id} value={pattern.id}>
                        {pattern.name}
                      </option>
                    ))}
                  </optgroup>
                  
                  {patterns.some(p => p.isCustom) && (
                    <optgroup label="Custom Patterns">
                      {patterns.filter(p => p.isCustom).map((pattern) => (
                        <option key={pattern.id} value={pattern.id}>
                          {pattern.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                
                {/* Show pattern description if available */}
                {patterns.find(p => (p.id === patternType || p.id === patternId))?.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {patterns.find(p => (p.id === patternType || p.id === patternId)).description}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-deep-sage mb-2" htmlFor="prize">
                  Prize
                </label>
                <input
                  id="prize"
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={prize}
                  onChange={(e) => setPrize(e.target.value)}
                  placeholder="e.g. $100 Cash Prize"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="bg-gray-300 text-gray-800 py-2 px-4 rounded"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="bg-dahlia text-white py-2 px-4 rounded"
                disabled={creating}
              >
                {creating ? 'Starting Game...' : 'Start Game'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GameSetup;