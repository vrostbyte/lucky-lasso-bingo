import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';

const AdvancedEventForm = ({ onClose, onEventAdded }) => {
  // Event details
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [numGames, setNumGames] = useState(3);
  const [totalPrizePool, setTotalPrizePool] = useState('');
  
  // Games planning
  const [games, setGames] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPatterns, setLoadingPatterns] = useState(true);
  
  // Pattern difficulty mapping (1-10 scale)
  const patternDifficulties = {
    'horizontal': 3,  // Horizontal Line - Easy
    'vertical': 3,    // Vertical Line - Easy
    'diagonal': 4,    // Diagonal Line - Medium-Easy
    'corners': 5,     // Four Corners - Medium
    'x_pattern': 7,   // X Pattern - Medium-Hard
    'blackout': 10    // Blackout - Hardest
  };
  
  // Load saved patterns
  useEffect(() => {
    const fetchPatterns = async () => {
      try {
        const patternsQuery = collection(db, 'patterns');
        const querySnapshot = await getDocs(patternsQuery);
        
        const patternsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          difficulty: 5, // Default medium difficulty for custom patterns
          isCustom: true
        }));
        
        // Add predefined patterns with their difficulties
        const predefinedPatterns = [
          { id: 'horizontal', name: 'Horizontal Line', difficulty: 3 },
          { id: 'vertical', name: 'Vertical Line', difficulty: 3 },
          { id: 'diagonal', name: 'Diagonal Line', difficulty: 4 },
          { id: 'corners', name: 'Four Corners', difficulty: 5 },
          { id: 'x_pattern', name: 'X Pattern', difficulty: 7 },
          { id: 'blackout', name: 'Blackout', difficulty: 10 }
        ];
        
        setPatterns([...predefinedPatterns, ...patternsList]);
      } catch (error) {
        console.error('Error fetching patterns:', error);
      } finally {
        setLoadingPatterns(false);
      }
    };
    
    fetchPatterns();
  }, []);
  
  // Initialize games array when numGames changes
  useEffect(() => {
    // Create games array with default values
    const gamesList = Array(parseInt(numGames) || 0).fill().map((_, index) => ({
      gameNumber: index + 1,
      patternId: 'horizontal', // Default to horizontal line
      patternDifficulty: 3,
      allocatedPercentage: 0,
      allocatedAmount: 0
    }));
    
    setGames(gamesList);
  }, [numGames]);
  
  // Recalculate prize allocations whenever games or totalPrizePool changes
  useEffect(() => {
    if (!totalPrizePool || games.length === 0) return;
    
    // Calculate total difficulty points
    const totalDifficulty = games.reduce((sum, game) => sum + game.patternDifficulty, 0);
    
    // Allocate prize pool based on difficulty
    const updatedGames = games.map(game => {
      const percentage = (game.patternDifficulty / totalDifficulty) * 100;
      const amount = (parseFloat(totalPrizePool) * (percentage / 100));
      
      return {
        ...game,
        allocatedPercentage: percentage.toFixed(1),
        allocatedAmount: amount.toFixed(2)
      };
    });
    
    setGames(updatedGames);
  }, [games.map(g => g.patternId).join(','), totalPrizePool]);
  
  // Handle pattern selection for a game
  const handlePatternChange = (index, patternId) => {
    // Find the pattern's difficulty
    const pattern = patterns.find(p => p.id === patternId);
    const difficulty = pattern ? pattern.difficulty : 5;
    
    // Update the game
    const updatedGames = [...games];
    updatedGames[index] = {
      ...updatedGames[index],
      patternId,
      patternDifficulty: difficulty
    };
    
    setGames(updatedGames);
  };
  
  // Move to next step
  const handleNextStep = () => {
    setStep(prev => prev + 1);
  };
  
  // Move to previous step
  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };
  
  // Generate a verification code
  const generateVerificationCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };
  
  // Save the event and pre-planned games
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const batch = writeBatch(db);
      
      // Create event document
      const eventRef = doc(collection(db, 'events'));
      const eventData = {
        name,
        location,
        date: new Date(date),
        totalGames: parseInt(numGames),
        totalPrizePool: parseFloat(totalPrizePool),
        status: 'upcoming',
        createdBy: auth.currentUser?.uid || 'anonymous',
        createdAt: serverTimestamp()
      };
      
      batch.set(eventRef, eventData);
      
      // Create pre-planned games
      games.forEach(game => {
        const pattern = patterns.find(p => p.id === game.patternId);
        const gameRef = doc(collection(db, 'games'));
        
        batch.set(gameRef, {
          eventId: eventRef.id,
          eventName: name,
          gameNumber: game.gameNumber,
          patternId: game.patternId,
          patternName: pattern ? pattern.name : 'Unknown Pattern',
          patternDifficulty: game.patternDifficulty,
          allocatedPercentage: parseFloat(game.allocatedPercentage),
          allocatedAmount: parseFloat(game.allocatedAmount),
          prize: `$${parseFloat(game.allocatedAmount).toFixed(2)}`,
          status: 'ready',
          verificationCode: generateVerificationCode(),
          createdAt: serverTimestamp()
        });
      });
      
      // Commit the batch
      await batch.commit();
      
      // Close the form and refresh the list
      onEventAdded();
      onClose();
    } catch (err) {
      console.error('Error creating event:', err);
      alert('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Render step 1: Basic Event Details
  const renderStep1 = () => (
    <div>
      <h2 className="text-xl font-bold text-deep-sage mb-4">Event Details</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-deep-sage mb-2" htmlFor="name">
            Event Name
          </label>
          <input
            id="name"
            type="text"
            className="w-full px-3 py-2 border rounded-md"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label className="block text-deep-sage mb-2" htmlFor="location">
            Location
          </label>
          <input
            id="location"
            type="text"
            className="w-full px-3 py-2 border rounded-md"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label className="block text-deep-sage mb-2" htmlFor="date">
            Date
          </label>
          <input
            id="date"
            type="date"
            className="w-full px-3 py-2 border rounded-md"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label className="block text-deep-sage mb-2" htmlFor="numGames">
            Number of Games
          </label>
          <input
            id="numGames"
            type="number"
            min="1"
            max="30"
            className="w-full px-3 py-2 border rounded-md"
            value={numGames}
            onChange={(e) => setNumGames(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label className="block text-deep-sage mb-2" htmlFor="totalPrizePool">
            Total Prize Pool ($)
          </label>
          <input
            id="totalPrizePool"
            type="number"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border rounded-md"
            value={totalPrizePool}
            onChange={(e) => setTotalPrizePool(e.target.value)}
            required
          />
        </div>
      </div>
      
      <div className="flex justify-end mt-6">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md mr-2"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleNextStep}
          className="px-4 py-2 bg-bluebell text-white rounded-md"
          disabled={!name || !location || !date || !numGames || !totalPrizePool}
        >
          Next: Plan Games
        </button>
      </div>
    </div>
  );
  
  // Render step 2: Plan Games
  const renderStep2 = () => (
    <div>
      <h2 className="text-xl font-bold text-deep-sage mb-4">Plan Games</h2>
      
      <div className="mb-4 p-3 bg-lilac bg-opacity-20 rounded-md">
        <p className="text-deep-sage">
          <span className="font-medium">Total Prize Pool:</span> ${parseFloat(totalPrizePool).toFixed(2)}
        </p>
        <p className="text-sm text-deep-sage">
          The prize pool will be automatically allocated based on pattern difficulty.
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-deep-sage text-white">
              <th className="px-3 py-2 text-left">Game #</th>
              <th className="px-3 py-2 text-left">Pattern</th>
              <th className="px-3 py-2 text-left">Difficulty</th>
              <th className="px-3 py-2 text-left">Allocation %</th>
              <th className="px-3 py-2 text-left">Prize Amount</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game, index) => {
              const pattern = patterns.find(p => p.id === game.patternId);
              
              return (
                <tr key={index} className="border-b border-gray-200">
                  <td className="px-3 py-2">Game #{game.gameNumber}</td>
                  <td className="px-3 py-2">
                    <select
                      value={game.patternId}
                      onChange={(e) => handlePatternChange(index, e.target.value)}
                      className="w-full px-2 py-1 border rounded-md"
                    >
                      <optgroup label="Standard Patterns">
                        {patterns.filter(p => !p.isCustom).map((pattern) => (
                          <option key={pattern.id} value={pattern.id}>
                            {pattern.name} (Difficulty: {pattern.difficulty})
                          </option>
                        ))}
                      </optgroup>
                      
                      {patterns.some(p => p.isCustom) && (
                        <optgroup label="Custom Patterns">
                          {patterns.filter(p => p.isCustom).map((pattern) => (
                            <option key={pattern.id} value={pattern.id}>
                              {pattern.name} (Difficulty: {pattern.difficulty})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </td>
                  <td className="px-3 py-2">{game.patternDifficulty}/10</td>
                  <td className="px-3 py-2">{game.allocatedPercentage}%</td>
                  <td className="px-3 py-2">${parseFloat(game.allocatedAmount).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={handlePrevStep}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-4 py-2 bg-dahlia text-white rounded-md"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Event & Games'}
        </button>
      </div>
    </div>
  );
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </div>
    </div>
  );
};

export default AdvancedEventForm;