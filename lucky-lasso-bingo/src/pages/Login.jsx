import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    console.log('Attempting login with:', email);
    
    try {
      console.log('Calling Firebase signInWithEmailAndPassword...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful!', userCredential.user);
      navigate('/dashboard'); // Explicitly navigate after login
    } catch (error) {
      console.error('Login error:', error.code, error.message);
      setError(`Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test function that uses hardcoded credentials
  const testDirectLogin = async () => {
    try {
      console.log('Testing direct Firebase login...');
      const testEmail = 'test@luckylasso.com'; // Use your actual test email
      const testPassword = '4theBINGO!'; // Use your actual test password
      const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
      console.log('Direct login successful!', userCredential.user);
      navigate('/dashboard'); // Explicitly navigate
    } catch (error) {
      console.error('Direct login error:', error);
      alert(`Direct login failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold text-deep-sage text-center mb-6">Lucky Lasso Bingo</h1>
        <h2 className="text-xl text-deep-sage text-center mb-6">Host Login</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-deep-sage mb-2" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-3 py-2 border rounded-md"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-deep-sage mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="w-full px-3 py-2 border rounded-md"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-bluebell text-white py-2 px-4 rounded-md hover:bg-opacity-90 transition-colors mb-4"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
          
          {/* Test button */}
          <button
            type="button"
            onClick={testDirectLogin}
            className="w-full bg-deep-sage text-white py-2 px-4 rounded-md hover:bg-opacity-90 transition-colors"
          >
            Test Direct Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;