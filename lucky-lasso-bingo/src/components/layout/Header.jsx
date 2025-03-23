// src/components/layout/Header.jsx

import { useState, useRef, useEffect } from 'react';
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
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  
  // Check if we're on the dashboard page
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    <header className="bg-deep-sage text-white p-4 rounded-lg shadow-md mb-6 mt-6 mx-auto max-w-7xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Lucky Lasso Bingo</h1>
        <div className="flex items-center">
          {title && <span className="mr-6 font-medium">{title}</span>}
          
          {/* Hamburger menu for mobile/tablet */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-white focus:outline-none"
              aria-label="Menu"
            >
              <div className="w-6 h-0.5 bg-white mb-1.5"></div>
              <div className="w-6 h-0.5 bg-white mb-1.5"></div>
              <div className="w-6 h-0.5 bg-white"></div>
            </button>
            
            {/* Dropdown menu */}
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                {/* Dashboard link - always show but highlight if not on dashboard */}
                <button
                  onClick={() => {
                    handleDashboardClick();
                    setShowMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-deep-sage hover:bg-gray-100"
                >
                  Dashboard
                </button>
                
                {/* Create Event link */}
                <button
                  onClick={() => {
                    setShowEventForm(true);
                    setShowMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-deep-sage hover:bg-gray-100"
                >
                  Create Event
                </button>
                
                {/* Advanced Planning link */}
                <button
                  onClick={() => {
                    setShowAdvancedEventForm(true);
                    setShowMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-deep-sage hover:bg-gray-100"
                >
                  Advanced Planning
                </button>
                
                {/* Pattern Creator link */}
                <button
                  onClick={() => {
                    navigate('/patterns');
                    setShowMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-deep-sage hover:bg-gray-100"
                >
                  Pattern Creator
                </button>
                
                {/* Divider */}
                <div className="border-t border-gray-200 my-1"></div>
                
                {/* Logout link */}
                {showLogout && (
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-dahlia hover:bg-gray-100"
                  >
                    Logout
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Desktop buttons removed - all functionality available through hamburger menu */}
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