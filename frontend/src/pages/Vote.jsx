import { useState, useEffect } from 'react';
import { socket } from '../socket';

export default function Vote() {
  const [isLocked, setIsLocked] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selected, setSelected] = useState([]);
  
  // Database State
  const [electionConfig, setElectionConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch the active election from MongoDB
    const fetchActiveElection = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/elections/active');
        if (response.ok) {
          const data = await response.json();
          setElectionConfig(data);
        } else {
          console.error('No active election found in database.');
        }
      } catch (error) {
        console.error('Failed to fetch election data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveElection();

    // 2. Socket Listeners for Phone Commands
    socket.on('unlock_tablet', () => {
      setIsLocked(false);
      setSelected([]);
    });

    socket.on('lock_tablet', () => {
      setIsLocked(true);
      setSelected([]);
    });

    return () => {
      socket.off('unlock_tablet');
      socket.off('lock_tablet');
    };
  }, []);

  const toggleSelection = (candidateId) => {
    if (!electionConfig) return;

    let newSelection;
    if (selected.includes(candidateId)) {
      newSelection = selected.filter(id => id !== candidateId);
    } else {
      newSelection = [...selected, candidateId];
    }

    setSelected(newSelection);

    // Auto-Submit Logic
    if (newSelection.length === electionConfig.maxSelections) {
      submitVote(newSelection);
    }
  };

  const submitVote = (finalSelection) => {
    const buzzer = new Audio('/buzzer.mp3');
    buzzer.play().catch(e => console.log("Audio blocked by browser:", e));

    setShowSuccess(true);
    setIsLocked(true);

    socket.emit('cast_vote', finalSelection);

    setTimeout(() => {
      setShowSuccess(false);
      setSelected([]);
    }, 3000);
  };

  // --- UI STATES ---
  if (isLoading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white text-2xl">Loading Election Data...</div>;
  }

  if (!electionConfig) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4 text-center">
        <h1 className="text-4xl font-bold mb-4">No Active Election</h1>
        <p className="text-gray-400">Please initialize an election from the Admin Dashboard.</p>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-green-500 flex items-center justify-center select-none">
        <h1 className="text-6xl md:text-8xl font-bold text-white tracking-widest animate-pulse">
          VOTE RECORDED!
        </h1>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 text-center select-none pointer-events-none">
        <div className="space-y-6">
          <div className="text-8xl md:text-[150px] animate-bounce mb-8">🔒</div>
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-wide">
            Please wait for the election officer.
          </h1>
          <p className="text-2xl text-gray-400 mt-4">
            The voting panel will unlock automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col select-none">
      <header className="bg-blue-600 text-white p-6 shadow-md flex justify-between items-center">
        <h1 className="text-2xl md:text-4xl font-bold">{electionConfig.name}</h1>
        <div className="text-xl md:text-2xl font-semibold bg-blue-800 px-6 py-3 rounded-xl border border-blue-400">
          Selected: {selected.length} / {electionConfig.maxSelections}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-8 flex flex-col justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {electionConfig.candidates.map((cand) => {
            const isSelected = selected.includes(cand._id); // Notice we use _id here
            return (
              <div 
                key={cand._id}
                onClick={() => toggleSelection(cand._id)}
                className={`flex items-center justify-between p-6 md:p-8 rounded-3xl border-4 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-blue-600 bg-blue-50 shadow-xl scale-[1.02]' 
                    : 'border-gray-200 bg-white shadow-sm active:scale-95'
                }`}
              >
                <div className="flex items-center gap-6 md:gap-10">
                  <span className="text-6xl md:text-7xl bg-gray-100 w-24 h-24 md:w-32 md:h-32 flex items-center justify-center rounded-full overflow-hidden shrink-0">
                    {cand.symbol.startsWith('http') ? (
                      <img src={cand.symbol} alt={cand.name} className="w-full h-full object-cover" />
                    ) : (
                      cand.symbol
                    )}
                  </span>
                  <span className="text-3xl md:text-5xl font-bold text-gray-900">{cand.name}</span>
                </div>
                
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full border-4 flex items-center justify-center shrink-0 ${
                  isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                }`}>
                  {isSelected && <span className="text-white text-3xl md:text-5xl font-bold">✓</span>}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}