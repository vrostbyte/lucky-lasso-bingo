import { useState } from 'react';

const TransactionTable = ({ transactions = [] }) => {
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle timestamp special case
    if (sortField === 'timestamp') {
      aValue = a.timestamp?.toDate?.() || new Date(0);
      bValue = b.timestamp?.toDate?.() || new Date(0);
    }

    if (aValue < bValue) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return '⇅';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        No transactions recorded for this event yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead>
          <tr className="bg-deep-sage text-white">
            <th 
              className="px-4 py-2 text-left cursor-pointer"
              onClick={() => handleSort('timestamp')}
            >
              <div className="flex items-center">
                Date/Time {getSortIcon('timestamp')}
              </div>
            </th>
            <th 
              className="px-4 py-2 text-left cursor-pointer"
              onClick={() => handleSort('itemType')}
            >
              <div className="flex items-center">
                Item {getSortIcon('itemType')}
              </div>
            </th>
            <th 
              className="px-4 py-2 text-left cursor-pointer"
              onClick={() => handleSort('quantity')}
            >
              <div className="flex items-center">
                Qty {getSortIcon('quantity')}
              </div>
            </th>
            <th 
              className="px-4 py-2 text-left cursor-pointer"
              onClick={() => handleSort('price')}
            >
              <div className="flex items-center">
                Price {getSortIcon('price')}
              </div>
            </th>
            <th 
              className="px-4 py-2 text-left cursor-pointer"
              onClick={() => handleSort('totalAmount')}
            >
              <div className="flex items-center">
                Total {getSortIcon('totalAmount')}
              </div>
            </th>
            <th className="px-4 py-2 text-left">Notes</th>
          </tr>
        </thead>
        <tbody>
          {sortedTransactions.map((transaction, index) => (
            <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="px-4 py-2">{formatDate(transaction.timestamp)}</td>
              <td className="px-4 py-2">{transaction.itemType}</td>
              <td className="px-4 py-2">{transaction.quantity}</td>
              <td className="px-4 py-2">{formatCurrency(transaction.price)}</td>
              <td className="px-4 py-2">{formatCurrency(transaction.totalAmount)}</td>
              <td className="px-4 py-2">
                {transaction.notes ? (
                  <div className="max-w-xs truncate" title={transaction.notes}>
                    {transaction.notes}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 font-medium">
            <td className="px-4 py-2" colSpan="4">Total</td>
            <td className="px-4 py-2">
              {formatCurrency(
                sortedTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0)
              )}
            </td>
            <td className="px-4 py-2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default TransactionTable;