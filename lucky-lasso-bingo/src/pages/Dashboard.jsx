import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, where, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/layout/Header';

const Dashboard = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [activeGames, setActiveGames] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Sorting state for active games
  const [activeSortField, setActiveSortField] = useState('gameNumber');
  const [activeSortDirection, setActiveSortDirection] = useState('asc');
  
  // Sorting state for recent games
  const [recentSortField, setRecentSortField] = useState('gameNumber');
  const [recentSortDirection, setRecentSortDirection] = useState('asc');

  // Function to fetch events from Firestore
  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Create a query to get events ordered by date
      const eventsQuery = query(
        collection(db, 'events'),
        orderBy('date', 'desc')
      );
      
      // Execute the query
      const querySnapshot = await getDocs(eventsQuery);
      
      // Convert query results to an array of event objects
      const eventsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamp to JS Date if needed
        date: doc.data().date instanceof Date ? doc.data().date : doc.data().date.toDate()
      }));
      
      setEvents(eventsList);
      console.log('Events loaded:', eventsList.length);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to fetch active games
  const fetchActiveGames = async () => {
    try {
      // Query for games that are in progress or paused
      const activeGamesQuery = query(
        collection(db, 'games'),
        where('status', 'in', ['in_progress', 'paused', 'ready']),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(activeGamesQuery);
      const gamesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      
      // Sort active games by gameNumber by default
      const sortedGames = [...gamesList].sort((a, b) => a.gameNumber - b.gameNumber);
      setActiveGames(sortedGames);
    } catch (error) {
      console.error('Error fetching active games:', error);
    }
  };
  
  // Function to fetch recent completed games
  const fetchRecentGames = async () => {
    try {
      // Query for completed games
      const completedGamesQuery = query(
        collection(db, 'games'),
        where('status', '==', 'completed'),
        orderBy('endTime', 'desc')
      );
      
      const querySnapshot = await getDocs(completedGamesQuery);
      const gamesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        endTime: doc.data().endTime?.toDate() || new Date()
      }));
      
      // Sort recent games by gameNumber by default
      const sortedGames = [...gamesList].sort((a, b) => a.gameNumber - b.gameNumber);
      setRecentGames(sortedGames);
    } catch (error) {
      console.error('Error fetching recent games:', error);
    }
  };

  // Delete an event and its games
  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event? This will also delete all games associated with this event.')) {
      return;
    }
    
    try {
      // First, query for all games in this event
      const gamesQuery = query(
        collection(db, 'games'),
        where('eventId', '==', eventId)
      );
      
      const gamesSnapshot = await getDocs(gamesQuery);
      
      // Delete all games in a batch
      const batch = writeBatch(db);
      gamesSnapshot.docs.forEach(gameDoc => {
        batch.delete(doc(db, 'games', gameDoc.id));
      });
      
      // Delete the event itself
      batch.delete(doc(db, 'events', eventId));
      
      // Commit the batch
      await batch.commit();
      
      // Refresh the events list
      fetchEvents();
      fetchActiveGames();
      fetchRecentGames();
      
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchEvents();
    fetchActiveGames();
    fetchRecentGames();
  }, []);


  
  // Handle sorting for active games
  const handleActiveSort = (field) => {
    if (activeSortField === field) {
      setActiveSortDirection(activeSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setActiveSortField(field);
      setActiveSortDirection('asc');
    }
  };
  
  // Handle sorting for recent games
  const handleRecentSort = (field) => {
    if (recentSortField === field) {
      setRecentSortDirection(recentSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setRecentSortField(field);
      setRecentSortDirection('asc');
    }
  };
  
  // Get sorted active games
  const getSortedActiveGames = () => {
    return [...activeGames].sort((a, b) => {
      let aValue = a[activeSortField];
      let bValue = b[activeSortField];
      
      // Handle special cases
      if (activeSortField === 'gameNumber') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }
      
      if (aValue < bValue) {
        return activeSortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return activeSortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };
  
  // Get sorted recent games
  const getSortedRecentGames = () => {
    return [...recentGames].sort((a, b) => {
      let aValue = a[recentSortField];
      let bValue = b[recentSortField];
      
      // Handle special cases
      if (recentSortField === 'gameNumber') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      } else if (recentSortField === 'potAmount') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      } else if (recentSortField === 'endTime') {
        aValue = aValue || new Date(0);
        bValue = bValue || new Date(0);
      }
      
      if (aValue < bValue) {
        return recentSortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return recentSortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };
  
  // Helper function to get sort icon
  const getSortIcon = (field, currentField, direction) => {
    if (currentField !== field) return '⇅';
    return direction === 'asc' ? '↑' : '↓';
  };
  
  // The first getSortedRecentGames function is used, this comment replaces the duplicate declaration

  return (
    <div className="min-h-screen bg-ivory p-6">
      <Header title="Dashboard" />
      
      <main className="container mx-auto">
        {/* Active Games Section */}
        {activeGames.length > 0 && (
          <div className="mb-8">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-deep-sage">Active Games</h2>
              <button
                onClick={() => fetchActiveGames()}
                className="text-bluebell hover:underline"
              >
                Refresh
              </button>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-deep-sage text-white">
                    <th 
                      className="px-4 py-2 text-left cursor-pointer"
                      onClick={() => handleActiveSort('gameNumber')}
                    >
                      <div className="flex items-center">
                        Game {getSortIcon('gameNumber', activeSortField, activeSortDirection)}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer"
                      onClick={() => handleActiveSort('eventName')}
                    >
                      <div className="flex items-center">
                        Event {getSortIcon('eventName', activeSortField, activeSortDirection)}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer"
                      onClick={() => handleActiveSort('patternName')}
                    >
                      <div className="flex items-center">
                        Pattern {getSortIcon('patternName', activeSortField, activeSortDirection)}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer"
                      onClick={() => handleActiveSort('status')}
                    >
                      <div className="flex items-center">
                        Status {getSortIcon('status', activeSortField, activeSortDirection)}
                      </div>
                    </th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedActiveGames().map((game) => (
                    <tr key={game.id} className="border-b border-gray-200">
                      <td className="px-4 py-2">Game #{game.gameNumber}</td>
                      <td className="px-4 py-2">{game.eventName}</td>
                      <td className="px-4 py-2">{game.patternName}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block px-2 py-1 rounded-full text-white text-xs ${
                          game.status === 'in_progress' ? 'bg-olivine' :
                          game.status === 'paused' ? 'bg-deep-sage' : 'bg-bluebell'
                        }`}>
                          {game.status === 'in_progress' ? 'In Progress' :
                           game.status === 'paused' ? 'Paused' : 'Ready'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => navigate(`/game/${game.id}`)}
                          className="bg-bluebell hover:bg-opacity-90 text-white py-1 px-3 rounded text-sm"
                        >
                          Continue
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      
        {/* Bingo Events Section */}
        <div className="mb-8">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-deep-sage">Bingo Events</h2>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-deep-sage">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-deep-sage mb-4">No events found.</p>
              <p className="text-deep-sage">
                Click "Create Event" to schedule your first bingo event.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => (
                <div 
                  key={event.id} 
                  className={`bg-white rounded-lg shadow-md overflow-hidden
                    ${event.status === 'completed' ? 'opacity-75' : ''}`}
                >
                  <div className="p-3 text-white bg-olivine">
                    <h3 className="font-bold">{event.name}</h3>
                  </div>
                  
                  <div className="p-4">
                    <p><span className="font-medium">Location:</span> {event.location}</p>
                    <p><span className="font-medium">Date:</span> {new Date(event.date).toLocaleDateString()}</p>
                    <p><span className="font-medium">Games:</span> {event.totalGames}</p>
                    
                    <div className="mt-4 flex justify-between">
                      <button
                        className="bg-bluebell hover:bg-opacity-90 text-white py-1 px-3 rounded text-sm"
                        onClick={() => navigate(`/event/${event.id}`)}
                      >
                        View Details
                      </button>
                      
                      <div className="flex space-x-2">
                        <button
                          className="bg-dahlia hover:bg-opacity-90 text-white py-1 px-3 rounded text-sm"
                          onClick={() => navigate(`/game/new?event=${event.id}`)}
                        >
                          Start Game
                        </button>
                        
                        <button
                          className="bg-red-500 hover:bg-opacity-90 text-white py-1 px-3 rounded text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(event.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Recent Games Section */}
        <div>
          <h2 className="text-2xl font-bold text-deep-sage mb-4">Recent Completed Games</h2>
          
          {recentGames.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-deep-sage">No completed games found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-deep-sage text-white">
                    <th className="px-4 py-2 text-left">Game</th>
                    <th className="px-4 py-2 text-left">Event</th>
                    <th className="px-4 py-2 text-left">Pattern</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Pot Amount</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentGames.map((game) => (
                    <tr key={game.id} className="border-b border-gray-200">
                      <td className="px-4 py-2">Game #{game.gameNumber}</td>
                      <td className="px-4 py-2">{game.eventName}</td>
                      <td className="px-4 py-2">{game.patternName}</td>
                      <td className="px-4 py-2">{game.endTime.toLocaleDateString()}</td>
                      <td className="px-4 py-2">${game.potAmount?.toFixed(2) || '0.00'}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => navigate(`/game-history/${game.id}`)}
                          className="bg-bluebell hover:bg-opacity-90 text-white py-1 px-3 rounded text-sm"
                        >
                          View History
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
