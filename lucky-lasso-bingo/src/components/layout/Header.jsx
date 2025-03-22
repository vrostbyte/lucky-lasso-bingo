// src/components/layout/Header.jsx

import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import EventForm from '../dashboard/EventForm';
import AdvancedEventForm from '../dashboard/AdvancedEventForm';

const Header = ({ title, showLogout = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showEventForm, setShowEventForm] = useState(false);
  const [showAdvancedEventForm, setShowAdvancedEventForm] = useState(false);
  
  // Check if we're on the dashboard page
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  const handleEventAdded = () => {
    // Refresh the page or fetch updated data
    if (isDashboard) {
      window.location.reload();
    }
  };

  return (
    <header className="bg-deep-sage text-white p-4 rounded-lg shadow-md mb-6 mt-6">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">Lucky Lasso Bingo</h1>
        <div className="flex items-center">
          {title && <span className="mr-6 font-medium">{title}</span>}
          
          <div className="flex items-center space-x-3">
            {/* Create Event button */}
            <button 
              onClick={() => setShowEventForm(true)}
              className="bg-bluebell hover:bg-opacity-90 text-white py-2 px-4 rounded"
            >
              Create Event
            </button>
            
            {/* Advanced Planning button */}
            <button 
              onClick={() => setShowAdvancedEventForm(true)}
              className="bg-olivine hover:bg-opacity-90 text-white py-2 px-4 rounded"
            >
              Advanced Planning
            </button>
            
            {/* Pattern Creator button */}
            <button 
              onClick={() => navigate('/patterns')}
              className="bg-lilac hover:bg-opacity-90 text-deep-sage py-2 px-4 rounded"
            >
              Pattern Creator
            </button>
            
            {/* Dashboard button - only show if not on dashboard */}
            {!isDashboard && (
              <button
                onClick={handleDashboardClick}
                className="bg-olivine hover:bg-opacity-90 text-white py-2 px-4 rounded"
              >
                Dashboard
              </button>
            )}
            
            {/* Logout button - with extra margin to avoid accidental clicks */}
            {showLogout && (
              <button
                onClick={handleLogout}
                className="bg-dahlia hover:bg-opacity-90 text-white py-2 px-4 rounded ml-4"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Event Form Modal */}
      {showEventForm && (
        <EventForm 
          onClose={() => setShowEventForm(false)} 
          onEventAdded={handleEventAdded} 
        />
      )}

      {/* Advanced Event Form Modal */}
      {showAdvancedEventForm && (
        <AdvancedEventForm 
          onClose={() => setShowAdvancedEventForm(false)} 
          onEventAdded={handleEventAdded} 
        />
      )}
    </header>
  );
};

export default Header;