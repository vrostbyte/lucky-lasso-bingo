import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';

const EventForm = ({ onClose, onEventAdded }) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [numGames, setNumGames] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Format the date properly
      const eventDate = new Date(date);
      
      // Create new event document
      const eventData = {
        name,
        location,
        date: eventDate,
        totalGames: Number(numGames),
        status: 'upcoming',
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'events'), eventData);
      console.log('Event created with ID:', docRef.id);
      
      // Close the form and refresh the list
      onEventAdded();
      onClose();
    } catch (err) {
      console.error('Error creating event:', err);
      setError('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-deep-sage mb-4">Create New Event</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-deep-sage mb-2" htmlFor="name">
              Event Name
            </label>
            <input
              id="name"
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-deep-sage mb-2" htmlFor="location">
              Location
            </label>
            <input
              id="location"
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-deep-sage mb-2" htmlFor="date">
              Date
            </label>
            <input
              id="date"
              type="date"
              className="w-full px-3 py-2 border rounded-md"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-deep-sage mb-2" htmlFor="numGames">
              Number of Games
            </label>
            <input
              id="numGames"
              type="number"
              min="1"
              max="30"
              className="w-full px-3 py-2 border rounded-md"
              value={numGames}
              onChange={(e) => setNumGames(e.target.value)}
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-bluebell text-white rounded-md"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventForm;