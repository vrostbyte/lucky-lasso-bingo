import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/layout/Header';

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load event details and games
  const fetchEventData = async () => {
    try {
      // Get event details
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      
      if (!eventDoc.exists()) {
        setError('Event not found');
        setLoading(false);
        return;
      }
      
      const eventData = {
        id: eventDoc.id,
        ...eventDoc.data(),
        date: eventDoc.data().date?.toDate() || new Date(eventDoc.data().date)
      };
      
      setEvent(eventData);
      
      // Get games for this event
      const gamesQuery = query(
        collection(db, 'games'),
        where('eventId', '==', eventId),
        orderBy('gameNumber', 'asc')
      );
      
      const gamesSnapshot = await getDocs(gamesQuery);
      const gamesData = gamesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      
      setGames(gamesData);
    } catch (err) {
      console.error('Error fetching event data:', err);
      setError('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchEventData();
  }, [eventId]);
  
  // Delete a game
  const handleDeleteGame = async (gameId) => {
    if (!window.confirm('Are you sure you want to delete this game?')) {
      return;
    }
    
    try {
      // Delete the game document
      await deleteDoc(doc(db, 'games', gameId));
      
      // Refresh the games list
      fetchEventData();
      
    } catch (error) {
      console.error('Error deleting game:', error);
      alert('Failed to delete game. Please try again.');
    }
  };
  
  // Get status label and color
  const getStatusInfo = (status) => {
    switch (status) {
      case 'ready':
        return { label: 'Ready to Start', color: 'bg-bluebell' };
      case 'in_progress':
        return { label: 'In Progress', color: 'bg-olivine' };
      case 'paused':
        return { label: 'Paused', color: 'bg-deep-sage' };
      case 'completed':
        return { label: 'Completed', color: 'bg-gray-500' };
      default:
        return { label: 'Unknown', color: 'bg-gray-500' };
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-ivory">
        <Header title="Loading Event..." />
        <div className="container mx-auto p-6 text-center">
          <p className="text-deep-sage">Loading event details...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-ivory">
        <Header title="Event Error" />
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
      <Header title={event.name} />
      
      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-deep-sage mb-2">{event.name}</h2>
              <p className="text-deep-sage mb-1"><span className="font-medium">Location:</span> {event.location}</p>
              <p className="text-deep-sage mb-1"><span className="font-medium">Date:</span> {event.date.toLocaleDateString()}</p>
              <p className="text-deep-sage"><span className="font-medium">Total Games:</span> {event.totalGames}</p>
              
              {event.totalPrizePool && (
                <p className="text-deep-sage mt-1">
                  <span className="font-medium">Total Prize Pool:</span> ${event.totalPrizePool.toFixed(2)}
                </p>
              )}
            </div>
            
            <button
              onClick={() => navigate(`/game/new?event=${eventId}`)}
              className="bg-dahlia text-white py-2 px-4 rounded hover:bg-opacity-90"
            >
              Start New Game
            </button>
          </div>
          
          <div className="mt-6">
            <h3 className="text-xl font-semibold text-deep-sage mb-3">Event Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-lilac bg-opacity-20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-deep-sage">{games.length}</div>
                <div className="text-deep-sage">Total Games</div>
              </div>
              
              <div className="bg-lilac bg-opacity-20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-deep-sage">
                  {games.filter(game => game.status === 'completed').length}
                </div>
                <div className="text-deep-sage">Completed Games</div>
              </div>
              
              <div className="bg-lilac bg-opacity-20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-deep-sage">
                  {games.filter(game => game.status === 'in_progress' || game.status === 'paused').length}
                </div>
                <div className="text-deep-sage">Active Games</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-deep-sage mb-3">Games</h3>
          
          {games.length === 0 ? (
            <p className="text-center text-gray-600 py-6">No games found for this event. Click "Start New Game" to create one.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-deep-sage text-white">
                    <th className="px-4 py-2 text-left">Game #</th>
                    <th className="px-4 py-2 text-left">Pattern</th>
                    <th className="px-4 py-2 text-left">Prize</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Balls Drawn</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((game) => {
                    const { label, color } = getStatusInfo(game.status);
                    
                    return (
                      <tr key={game.id} className="border-b border-gray-200">
                        <td className="px-4 py-3">Game #{game.gameNumber}</td>
                        <td className="px-4 py-3">{game.patternName}</td>
                        <td className="px-4 py-3">{game.prize}</td>
                        <td className="px-4 py-3">
                          <span className={`${color} text-white text-xs px-2 py-1 rounded-full`}>
                            {label}
                          </span>
                        </td>
                        <td className="px-4 py-3">{game.drawnBalls?.length || 0} / 75</td>
                        <td className="px-4 py-3">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => navigate(`/game/${game.id}`)}
                              className="bg-bluebell text-white px-3 py-1 rounded text-sm"
                            >
                              {game.status === 'completed' ? 'View' : 'Continue'}
                            </button>
                            
                            <button
                              onClick={() => navigate(`/game-history/${game.id}`)}
                              className="bg-olivine text-white px-3 py-1 rounded text-sm"
                            >
                              History
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteGame(game.id);
                              }}
                              className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetails;