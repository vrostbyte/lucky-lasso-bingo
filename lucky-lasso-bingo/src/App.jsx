import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// Pages
import Dashboard from './pages/Dashboard';
import GameView from './pages/GameView';
import GameSetup from './pages/GameSetup';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import CardVerification from './pages/CardVerification';
import PatternCreator from './pages/PatternCreator';
import EventDetails from './pages/EventDetails';
import GameHistory from './pages/GameHistory';
import PublicView from './pages/PublicView';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publicGameData, setPublicGameData] = useState(null);

  useEffect(() => {
    console.log('Setting up auth state listener...');
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');
      setUser(user);
      setLoading(false);
    });

    // Listen for the current game to update public view
    // Note: You'll need to modify this to listen to the specific game for the public view
    const gameRef = doc(db, 'games', 'YOUR_CURRENT_GAME_ID');
    const unsubscribeGame = onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
        const gameData = {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        };
        setPublicGameData(gameData);
      }
    });

    // Cleanup subscriptions
    return () => {
      unsubscribeAuth();
      unsubscribeGame();
    };
  }, []);

  if (loading) {
    console.log('App is in loading state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <p className="text-deep-sage text-xl">Loading...</p>
      </div>
    );
  }

  console.log('Rendering app with user:', user ? user.email : 'No user');
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Dashboard /> : <Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/game/new" element={<GameSetup />} />
        <Route path="/game/:gameId" element={<GameView />} />
        {/* New Public View Route */}
        <Route 
          path="/public/:gameId" 
          element={
            <PublicView 
              gameData={publicGameData} 
              onUpdateGame={setPublicGameData} 
            />
          } 
        />
        <Route path="/event/:eventId" element={<EventDetails />} />
        <Route path="/game-history/:gameId" element={<GameHistory />} />
        <Route path="/verify" element={<CardVerification />} />
        <Route path="/patterns" element={<PatternCreator />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;