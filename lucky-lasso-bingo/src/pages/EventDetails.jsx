import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/layout/Header';
import TransactionForm from '../components/TransactionForm';
import TransactionTable from '../components/TransactionTable';

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [sales, setSales] = useState({
    daubersSold: 0,
    cardsSold: 0,
    digitalTips: 0,
    cashTips: 0,
    cardPrice: 1,
    dauberPrice: 2,
    roundingLoss: 0,
    totalPayout: 0,
    totalRevenue: 0,
    profit: 0
  });

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          const eventData = eventDoc.data();
          setEvent({
            id: eventDoc.id,
            ...eventData,
            date: eventData.date?.toDate() || new Date(),
          });
          if (eventData.sales) {
            setSales(prevSales => ({
              ...prevSales,
              ...eventData.sales,
            }));
          }
          if (eventData.transactions) {
            setTransactions(eventData.transactions);
          }
        } else {
          setError("Event not found");
        }
      } catch (err) {
        console.error(err);
        setError("Error loading event");
      }
    };

    const fetchGames = async () => {
      try {
        const gamesQuery = query(
          collection(db, 'games'),
          where('eventId', '==', eventId)
        );
        const querySnapshot = await getDocs(gamesQuery);
        const gamesList = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate() || new Date(),
          endTime: docSnap.data().endTime?.toDate() || null,
        }));
        setGames(gamesList);
      } catch (err) {
        console.error(err);
      }
    };

    Promise.all([fetchEvent(), fetchGames()]).then(() => setLoading(false));
  }, [eventId]);

  const handleSalesChange = async (field, value) => {
    const updatedSales = { ...sales, [field]: value };
    setSales(updatedSales);
    try {
      await updateDoc(doc(db, 'events', eventId), {
        sales: updatedSales
      });
      console.log("Sales updated in Firestore:", updatedSales);
    } catch (error) {
      console.error("Error updating sales:", error);
    }
  };

  let totalRoundingLoss = 0;
  let totalActualPayout = 0;
  games.forEach(game => {
    if (game.status === 'completed') {
      totalRoundingLoss += game.roundingLoss || 0;
      totalActualPayout += game.totalActualPayout || 0;
    }
  });

  // Calculate transaction revenue
  const transactionRevenue = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  
  // Legacy sales calculations (kept for backward compatibility)
  const totalCardSales = sales.cardsSold * sales.cardPrice;
  const totalDauberSales = sales.daubersSold * sales.dauberPrice;
  const totalTips = sales.digitalTips + sales.cashTips;
  
  // Total revenue now includes transaction revenue
  const totalRevenue = transactionRevenue + totalTips;
  const profit = totalRevenue - totalActualPayout;

  const completedGames = games.filter(game => game.status === 'completed');

  let allBalls = [];
  let mostFrequentBall = null;
  let mostFrequentLetter = null;
  let gameWithBiggestPot = null;
  let gameWithMostWinners = null;
  let gameWithLeastWinners = null;
  let longestGame = null;

  if (completedGames.length > 0) {
    completedGames.forEach(game => {
      if (Array.isArray(game.drawnBalls)) {
        allBalls = allBalls.concat(game.drawnBalls);
      }
    });

    const ballCounter = {};
    allBalls.forEach(ball => {
      ballCounter[ball] = (ballCounter[ball] || 0) + 1;
    });
    mostFrequentBall = Object.entries(ballCounter).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const columnCounter = { B: 0, I: 0, N: 0, G: 0, O: 0 };
    allBalls.forEach(ball => {
      const letter = ball.charAt(0);
      if (Object.prototype.hasOwnProperty.call(columnCounter, letter)) {
        columnCounter[letter]++;
      }
    });
    mostFrequentLetter = Object.entries(columnCounter).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    gameWithBiggestPot = completedGames.reduce((max, g) =>
      (g.potAmount || 0) > (max.potAmount || 0) ? g : max, completedGames[0]);

    gameWithMostWinners = completedGames.reduce((max, g) =>
      (g.winnerCount || 0) > (max.winnerCount || 0) ? g : max, completedGames[0]);

    gameWithLeastWinners = completedGames.reduce((min, g) =>
      (g.winnerCount || Infinity) < (min.winnerCount || Infinity) ? g : min, completedGames[0]);

    longestGame = completedGames.reduce((max, g) =>
      (g.duration || 0) > (max.duration || 0) ? g : max, completedGames[0]);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory">
        <Header title="Event Details" />
        <div className="container mx-auto p-6 text-center">
          <p className="text-deep-sage">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ivory">
        <Header title="Event Details" />
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

  const handleTransactionAdded = () => {
    // Refresh event data to get updated transactions
    const fetchEvent = async () => {
      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          const eventData = eventDoc.data();
          if (eventData.transactions) {
            setTransactions(eventData.transactions);
          }
        }
      } catch (err) {
        console.error('Error refreshing event data:', err);
      }
    };
    fetchEvent();
  };

  return (
    <div className="min-h-screen bg-ivory">
      <Header title={`Event: ${event.name}`} />
      <div className="max-w-7xl mx-auto p-4">
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-deep-sage">Transactions</h2>
            <button
              onClick={() => setShowTransactionForm(true)}
              className="bg-bluebell hover:bg-opacity-90 text-white py-2 px-4 rounded flex items-center"
            >
              <span className="mr-1">+</span> Add Transaction
            </button>
          </div>
          <TransactionTable transactions={transactions} />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-deep-sage mb-4">Event Stats</h2>
          {completedGames.length === 0 ? (
            <p className="text-gray-500">No completed games to show stats.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-deep-sage">Most Frequent Ball</p>
                <p className="text-deep-sage font-medium">{mostFrequentBall || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-deep-sage">Most Common Column</p>
                <p className="text-deep-sage font-medium">{mostFrequentLetter || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-deep-sage">Biggest Pot</p>
                <p className="text-deep-sage font-medium">
                  ${gameWithBiggestPot?.potAmount?.toFixed(2) || '0.00'} (Game #{gameWithBiggestPot?.gameNumber})
                </p>
              </div>
              <div>
                <p className="text-sm text-deep-sage">Most Winners</p>
                <p className="text-deep-sage font-medium">
                  {gameWithMostWinners?.winnerCount || 0} (Game #{gameWithMostWinners?.gameNumber})
                </p>
              </div>
              <div>
                <p className="text-sm text-deep-sage">Least Winners</p>
                <p className="text-deep-sage font-medium">
                  {gameWithLeastWinners?.winnerCount || 0} (Game #{gameWithLeastWinners?.gameNumber})
                </p>
              </div>
              <div>
                <p className="text-sm text-deep-sage">Longest Game</p>
                <p className="text-deep-sage font-medium">
                  {longestGame?.duration
                    ? `${Math.floor(longestGame.duration / 60)}m ${longestGame.duration % 60}s`
                    : '--'}{' '}
                  (Game #{longestGame?.gameNumber})
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-deep-sage mb-4">Games for this Event</h2>
          {games.length === 0 ? (
            <p className="text-center text-gray-500">No games found for this event.</p>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="bg-deep-sage text-white">
                  <th className="px-4 py-2 text-left">Game #</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Pot Amount</th>
                  <th className="px-4 py-2 text-left">Rounding Loss</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {games.map(game => (
                  <tr key={game.id} className="border-b border-gray-200">
                    <td className="px-4 py-2">Game #{game.gameNumber}</td>
                    <td className="px-4 py-2">{game.status}</td>
                    <td className="px-4 py-2">${game.potAmount?.toFixed(2) || '0.00'}</td>
                    <td className="px-4 py-2">${game.roundingLoss?.toFixed(2) || '0.00'}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => navigate(`/game-history/${game.id}`)}
                        className="bg-bluebell hover:bg-opacity-90 text-white py-1 px-3 rounded text-sm"
                      >
                        View Game
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-2xl font-bold text-deep-sage mb-3">Financial Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-600">Transaction Revenue</p>
              <p className="text-lg font-medium text-deep-sage">${transactionRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-600">Total Tips</p>
              <p className="text-lg font-medium text-deep-sage">${totalTips.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-600">Total Payouts</p>
              <p className="text-lg font-medium text-deep-sage">${totalActualPayout.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-lg font-medium text-olivine">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-600">Profit</p>
              <p className="text-lg font-medium text-deep-sage">${profit.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-600">Total Rounding Loss</p>
              <p className="text-lg font-medium text-deep-sage">${totalRoundingLoss.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 bg-bluebell hover:bg-opacity-90 text-white py-2 px-4 rounded"
        >
          Back to Dashboard
        </button>
        
        {showTransactionForm && (
          <TransactionForm 
            eventId={eventId} 
            onClose={() => setShowTransactionForm(false)} 
            onTransactionAdded={handleTransactionAdded} 
          />
        )}
      </div>
    </div>
  );
};

export default EventDetails;
