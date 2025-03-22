import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Header from '../components/layout/Header';

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sales, setSales] = useState({
    daubersSold: 0,
    cardsSold: 0,
    digitalTips: 0,
    cashTips: 0,
    cardPrice: 1,
    dauberPrice: 2
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

  const totalCardSales = sales.cardsSold * sales.cardPrice;
  const totalDauberSales = sales.daubersSold * sales.dauberPrice;
  const totalRevenue = totalCardSales + totalDauberSales + sales.digitalTips + sales.cashTips;
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
      if (columnCounter.hasOwnProperty(letter)) {
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

  return (
    <div className="min-h-screen bg-ivory">
      <Header title={`Event: ${event.name}`} />
      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-deep-sage mb-4">Event Sales Tracker</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-deep-sage mb-1">Daubers Sold</label>
              <input
                type="number"
                className="w-full p-2 border rounded"
                value={sales.daubersSold}
                onChange={(e) => handleSalesChange('daubersSold', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm text-deep-sage mb-1">Cards Sold</label>
              <input
                type="number"
                className="w-full p-2 border rounded"
                value={sales.cardsSold}
                onChange={(e) => handleSalesChange('cardsSold', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm text-deep-sage mb-1">Cash Tips</label>
              <input
                type="number"
                className="w-full p-2 border rounded"
                value={sales.cashTips}
                onChange={(e) => handleSalesChange('cashTips', parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm text-deep-sage mb-1">Digital Tips</label>
              <input
                type="number"
                className="w-full p-2 border rounded"
                value={sales.digitalTips}
                onChange={(e) => handleSalesChange('digitalTips', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-lilac bg-opacity-20 p-3 rounded-lg">
              <p className="text-sm text-deep-sage">Total Revenue</p>
              <p className="text-deep-sage font-medium">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-lilac bg-opacity-20 p-3 rounded-lg">
              <p className="text-sm text-deep-sage">Profit (Revenue - Payouts)</p>
              <p className="text-deep-sage font-medium">${profit.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-deep-sage mb-4">Financial Summary</h2>
          <p><span className="font-medium">Total Rounding Loss:</span> ${totalRoundingLoss.toFixed(2)}</p>
          <p><span className="font-medium">Total Actual Payout:</span> ${totalActualPayout.toFixed(2)}</p>
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

        <div className="bg-white rounded-lg shadow-md p-6">
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

        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 bg-bluebell hover:bg-opacity-90 text-white py-2 px-4 rounded"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default EventDetails;
