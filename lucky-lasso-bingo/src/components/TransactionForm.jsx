import { useState } from 'react';
import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

const TransactionForm = ({ eventId, onClose, onTransactionAdded }) => {
  const [itemType, setItemType] = useState('Card');
  const [customItemType, setCustomItemType] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCustomItem, setShowCustomItem] = useState(false);

  // Predefined item types
  const itemTypes = ['Card', 'Dauber', 'Snack', 'Other'];

  const handleItemTypeChange = (e) => {
    const value = e.target.value;
    setItemType(value);
    setShowCustomItem(value === 'Other');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Calculate total amount
      const totalAmount = quantity * parseFloat(price);
      
      // Prepare transaction data
      const transactionData = {
        itemType: itemType === 'Other' ? customItemType : itemType,
        quantity: parseInt(quantity),
        price: parseFloat(price),
        totalAmount,
        notes,
        timestamp: Timestamp.now() // Use Timestamp.now() instead of serverTimestamp()
      };

      // Update the event document with the new transaction
      await updateDoc(doc(db, 'events', eventId), {
        transactions: arrayUnion(transactionData)
      });

      // Close the form and notify parent component
      onTransactionAdded();
      onClose();
    } catch (err) {
      console.error('Error adding transaction:', err);
      setError('Failed to add transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-deep-sage mb-4">Add Transaction</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-deep-sage mb-2" htmlFor="itemType">
              Item Type
            </label>
            <select
              id="itemType"
              className="w-full px-3 py-2 border rounded-md text-black"
              value={itemType}
              onChange={handleItemTypeChange}
              required
            >
              {itemTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          
          {showCustomItem && (
            <div className="mb-4">
              <label className="block text-deep-sage mb-2" htmlFor="customItemType">
                Custom Item Name
              </label>
              <input
                id="customItemType"
                type="text"
                className="w-full px-3 py-2 border rounded-md text-black"
                value={customItemType}
                onChange={(e) => setCustomItemType(e.target.value)}
                placeholder="Enter custom item name"
                required={showCustomItem}
              />
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-deep-sage mb-2" htmlFor="quantity">
              Quantity
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              className="w-full px-3 py-2 border rounded-md text-black"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-deep-sage mb-2" htmlFor="price">
              Price Per Item ($)
            </label>
            <input
              id="price"
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border rounded-md text-black"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-deep-sage mb-2" htmlFor="notes">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              className="w-full px-3 py-2 border rounded-md text-black"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-bluebell text-white rounded-md"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;