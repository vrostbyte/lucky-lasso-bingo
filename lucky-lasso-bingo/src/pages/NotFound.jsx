import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ivory">
      <h1 className="text-4xl font-bold text-deep-sage mb-4">404 - Page Not Found</h1>
      <p className="text-deep-sage mb-6">The page you are looking for doesn't exist.</p>
      <Link 
        to="/" 
        className="bg-bluebell text-white py-2 px-6 rounded-md hover:bg-opacity-90 transition-colors"
      >
        Go Home
      </Link>
    </div>
  );
};

export default NotFound;