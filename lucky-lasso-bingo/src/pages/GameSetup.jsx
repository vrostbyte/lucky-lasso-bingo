import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
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
  
  // Fetch event details
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
          // Set default game number based on previous games (for now just 1)
          setGameNumber('1');
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
  }, []);
  
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
        <div className="container mx-auto p-6 text-center">
          <p className="text-deep-sage">Loading...</p>
        </div>
      </div>
    );
  }
  
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
      
      <div className="container mx-auto p-6">
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