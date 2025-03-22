import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = ({ title, showLogout = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
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

  return (
    <header className="bg-deep-sage text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">Lucky Lasso Bingo</h1>
        <div className="flex items-center space-x-4">
          {title && <span className="mr-4 font-medium">{title}</span>}
          
          {/* Dashboard button - only show if not on dashboard */}
          {!isDashboard && (
            <button
              onClick={handleDashboardClick}
              className="bg-olivine hover:bg-opacity-90 text-white py-2 px-4 rounded"
            >
              Dashboard
            </button>
          )}
          
          {showLogout && (
            <button
              onClick={handleLogout}
              className="bg-dahlia hover:bg-opacity-90 text-white py-2 px-4 rounded"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;