import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import Header from '../components/layout/Header';

const PatternCreator = () => {
  const navigate = useNavigate();
  
  // Pattern grid state (5x5 grid)
  const [patternGrid, setPatternGrid] = useState(
    Array(5).fill().map(() => Array(5).fill(false))
  );
  
  // Pattern details
  const [patternName, setPatternName] = useState('');
  const [patternDescription, setPatternDescription] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Saved patterns list
  const [savedPatterns, setSavedPatterns] = useState([]);
  const [loadingPatterns, setLoadingPatterns] = useState(true);
  
  // Preset patterns
  const presetPatterns = [
    {
      name: 'Horizontal Line',
      description: 'Any complete horizontal line',
      grid: [
        [false, false, false, false, false],
        [false, false, false, false, false],
        [true, true, true, true, true],
        [false, false, false, false, false],
        [false, false, false, false, false]
      ]
    },
    {
      name: 'Vertical Line',
      description: 'Any complete vertical line',
      grid: [
        [false, false, true, false, false],
        [false, false, true, false, false],
        [false, false, true, false, false],
        [false, false, true, false, false],
        [false, false, true, false, false]
      ]
    },
    {
      name: 'Diagonal',
      description: 'Any complete diagonal line',
      grid: [
        [true, false, false, false, false],
        [false, true, false, false, false],
        [false, false, true, false, false],
        [false, false, false, true, false],
        [false, false, false, false, true]
      ]
    },
    {
      name: 'Four Corners',
      description: 'All four corners marked',
      grid: [
        [true, false, false, false, true],
        [false, false, false, false, false],
        [false, false, false, false, false],
        [false, false, false, false, false],
        [true, false, false, false, true]
      ]
    },
    {
      name: 'X Pattern',
      description: 'Both diagonals marked',
      grid: [
        [true, false, false, false, true],
        [false, true, false, true, false],
        [false, false, true, false, false],
        [false, true, false, true, false],
        [true, false, false, false, true]
      ]
    },
    {
      name: 'Blackout',
      description: 'All squares marked',
      grid: [
        [true, true, true, true, true],
        [true, true, true, true, true],
        [true, true, true, true, true],
        [true, true, true, true, true],
        [true, true, true, true, true]
      ]
    }
  ];
  
  // Load saved patterns
  useEffect(() => {
    const fetchPatterns = async () => {
      try {
        const patternsQuery = query(collection(db, 'patterns'));
        const querySnapshot = await getDocs(patternsQuery);
        
        const patterns = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setSavedPatterns(patterns);
      } catch (error) {
        console.error('Error fetching patterns:', error);
      } finally {
        setLoadingPatterns(false);
      }
    };
    
    fetchPatterns();
  }, []);
  
  // Toggle a cell in the pattern grid
  const toggleCell = (row, col) => {
    const newGrid = [...patternGrid];
    newGrid[row][col] = !newGrid[row][col];
    setPatternGrid(newGrid);
  };
  
  // Clear the pattern grid
  const clearGrid = () => {
    setPatternGrid(Array(5).fill().map(() => Array(5).fill(false)));
  };
  
  // Fill all cells
  const fillGrid = () => {
    setPatternGrid(Array(5).fill().map(() => Array(5).fill(true)));
  };
  
  // Load a preset pattern
  const loadPreset = (preset) => {
    setPatternGrid(preset.grid);
    setPatternName(preset.name);
    setPatternDescription(preset.description);
  };
  
  // Load a saved pattern
  const loadSavedPattern = (pattern) => {
    // Convert the stored array to a 2D grid
    const grid = [];
    for (let i = 0; i < 5; i++) {
      const row = [];
      for (let j = 0; j < 5; j++) {
        row.push(pattern.grid[i * 5 + j]);
      }
      grid.push(row);
    }
    
    setPatternGrid(grid);
    setPatternName(pattern.name);
    setPatternDescription(pattern.description);
  };
  
  // Save the pattern
  const savePattern = async (e) => {
    e.preventDefault();
    
    if (!patternName) {
      alert('Please enter a name for your pattern');
      return;
    }
    
    setSaving(true);
    
    try {
      // Flatten the 2D grid to a 1D array for storage
      const flatGrid = patternGrid.reduce((acc, row) => [...acc, ...row], []);
      
      const patternData = {
        name: patternName,
        description: patternDescription,
        grid: flatGrid,
        createdBy: auth.currentUser?.uid || 'anonymous',
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'patterns'), patternData);
      
      // Add to local state
      setSavedPatterns([
        ...savedPatterns,
        { id: docRef.id, ...patternData, createdAt: new Date() }
      ]);
      
      alert('Pattern saved successfully!');
      clearForm();
    } catch (error) {
      console.error('Error saving pattern:', error);
      alert('Failed to save pattern. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Delete a saved pattern
  const deletePattern = async (patternId) => {
    if (!confirm('Are you sure you want to delete this pattern?')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'patterns', patternId));
      
      // Remove from local state
      setSavedPatterns(savedPatterns.filter(p => p.id !== patternId));
      
      alert('Pattern deleted successfully!');
    } catch (error) {
      console.error('Error deleting pattern:', error);
      alert('Failed to delete pattern. Please try again.');
    }
  };
  
  // Clear the form
  const clearForm = () => {
    setPatternName('');
    setPatternDescription('');
    clearGrid();
  };
  
  return (
    <div className="min-h-screen bg-ivory">
      <Header title="Pattern Creator" />
      
      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Pattern Editor */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-deep-sage mb-4">Create Bingo Pattern</h2>
              
              <div className="mb-6">
                <div className="w-full max-w-md mx-auto">
                  <p className="text-center text-deep-sage mb-2">Click cells to toggle:</p>
                  
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {['B', 'I', 'N', 'G', 'O'].map((letter, idx) => (
                      <div 
                        key={letter} 
                        className="h-8 flex items-center justify-center font-bold rounded text-white bg-deep-sage"
                      >
                        {letter}
                      </div>
                    ))}
                    
                    {patternGrid.map((row, rowIndex) => (
                      row.map((cell, colIndex) => {
                        const isFreeSpace = rowIndex === 2 && colIndex === 2;
                        
                        return (
                          <div 
                            key={`${rowIndex}-${colIndex}`}
                            onClick={() => !isFreeSpace && toggleCell(rowIndex, colIndex)}
                            className={`h-12 w-12 rounded cursor-pointer flex items-center justify-center transition-colors ${
                              isFreeSpace
                                ? 'bg-lilac bg-opacity-30 text-deep-sage font-bold'
                                : cell
                                  ? 'bg-olivine text-white'
                                  : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                          >
                            {isFreeSpace ? 'FREE' : ''}
                          </div>
                        );
                      })
                    ))}
                  </div>
                  
                  <div className="flex justify-center space-x-4 mb-4">
                    <button
                      onClick={clearGrid}
                      className="py-1 px-3 border border-gray-300 rounded text-sm"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={fillGrid}
                      className="py-1 px-3 border border-gray-300 rounded text-sm"
                    >
                      Fill All
                    </button>
                  </div>
                </div>
              </div>
              
              <form onSubmit={savePattern}>
                <div className="mb-4">
                  <label htmlFor="patternName" className="block text-deep-sage mb-2">
                    Pattern Name
                  </label>
                  <input
                    id="patternName"
                    type="text"
                    className="w-full px-3 py-2 border rounded-md"
                    value={patternName}
                    onChange={(e) => setPatternName(e.target.value)}
                    required
                    placeholder="e.g. Diamond"
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="patternDescription" className="block text-deep-sage mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    id="patternDescription"
                    className="w-full px-3 py-2 border rounded-md"
                    rows="2"
                    value={patternDescription}
                    onChange={(e) => setPatternDescription(e.target.value)}
                    placeholder="Describe your pattern..."
                  ></textarea>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={clearForm}
                    className="px-4 py-2 border border-gray-300 rounded-md"
                  >
                    Clear Form
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-bluebell text-white rounded-md"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Pattern'}
                  </button>
                </div>
              </form>
            </div>
            
            {/* Preset Patterns */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-xl font-bold text-deep-sage mb-4">Preset Patterns</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {presetPatterns.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => loadPreset(preset)}
                    className="p-3 border rounded-md text-left hover:bg-ivory transition-colors"
                  >
                    <div className="font-medium text-deep-sage">{preset.name}</div>
                    <div className="text-sm text-gray-600 mb-2">{preset.description}</div>
                    
                    <div className="grid grid-cols-5 gap-1">
                      {preset.grid.map((row, rowIndex) => (
                        row.map((cell, colIndex) => {
                          const isFreeSpace = rowIndex === 2 && colIndex === 2;
                          
                          return (
                            <div 
                              key={`preview-${rowIndex}-${colIndex}`}
                              className={`h-3 w-3 rounded ${
                                isFreeSpace
                                  ? 'bg-lilac'
                                  : cell
                                    ? 'bg-olivine'
                                    : 'bg-gray-200'
                              }`}
                            ></div>
                          );
                        })
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Right: Saved Patterns */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold text-deep-sage mb-4">Saved Patterns</h2>
              
              {loadingPatterns ? (
                <p className="text-center text-gray-600 py-4">Loading saved patterns...</p>
              ) : savedPatterns.length === 0 ? (
                <p className="text-center text-gray-600 py-4">No saved patterns yet.</p>
              ) : (
                <div className="space-y-4">
                  {savedPatterns.map((pattern) => (
                    <div 
                      key={pattern.id}
                      className="p-3 border rounded-md"
                    >
                      <div className="font-medium text-deep-sage">{pattern.name}</div>
                      {pattern.description && (
                        <div className="text-sm text-gray-600 mb-2">{pattern.description}</div>
                      )}
                      
                      <div className="grid grid-cols-5 gap-1 mb-3">
                        {Array(5).fill().map((_, rowIndex) => (
                          Array(5).fill().map((_, colIndex) => {
                            const index = rowIndex * 5 + colIndex;
                            const isFreeSpace = rowIndex === 2 && colIndex === 2;
                            
                            return (
                              <div 
                                key={`saved-${rowIndex}-${colIndex}`}
                                className={`h-4 w-4 rounded ${
                                  isFreeSpace
                                    ? 'bg-lilac'
                                    : pattern.grid[index]
                                      ? 'bg-olivine'
                                      : 'bg-gray-200'
                                }`}
                              ></div>
                            );
                          })
                        ))}
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => loadSavedPattern(pattern)}
                          className="py-1 px-2 text-xs bg-bluebell text-white rounded"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deletePattern(pattern.id)}
                          className="py-1 px-2 text-xs bg-dahlia text-white rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-6 p-3 bg-ivory rounded-md">
                <p className="text-deep-sage text-sm">
                  <strong>Tip:</strong> Create patterns by clicking on the grid cells. 
                  The FREE space in the middle is always included.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatternCreator;