import { useState,useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  
  const [electionName, setElectionName] = useState('School Elections 2026-27');
  const [maxSelections, setMaxSelections] = useState(1);
  const [candidateName, setCandidateName] = useState('');
  const [candidateSymbol, setCandidateSymbol] = useState('');
  const [candidates, setCandidates] = useState([]);

  const [isElectionActive, setIsElectionActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Tracks the network request
  
  const [pastElections, setPastElections] = useState([]);

  // Fetch data when the Dashboard loads
  useEffect(() => {
    // 1. Check if an election is currently running to lock the UI
    const checkActiveElection = async () => {
      try {
        const response = await fetch('https://school-election-evm-backend.onrender.com');
        if (response.ok) setIsElectionActive(true);
      } catch (error) {
        console.error("Error checking active election:", error);
      }
    };

    // 2. Fetch the completed elections for the history list
    const fetchPastElections = async () => {
      try {
        const response = await fetch('https://school-election-evm-backend.onrender.com');
        if (response.ok) {
          const data = await response.json();
          setPastElections(data);
        }
      } catch (error) {
        console.error("Error fetching past elections:", error);
      }
    };

    checkActiveElection();
    fetchPastElections();
  }, []);

  const canProceed = electionName.trim() !== '' && candidates.length > maxSelections;

  const handleAddCandidate = (e) => {
    e.preventDefault();
    if (!candidateName || !candidateSymbol) return;

    const nameExists = candidates.some(
      (cand) => cand.name.toLowerCase() === candidateName.trim().toLowerCase()
    );

    if (nameExists) {
      alert("A candidate with this exact name already exists!");
      return;
    }
    
    setCandidates([...candidates, { 
      id: Date.now(), 
      name: candidateName.trim(), 
      symbol: candidateSymbol.trim() 
    }]);
    setCandidateName('');
    setCandidateSymbol('');
  };

  // --- Save Election to MongoDB ---
  const handleInitializeElection = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('https://school-election-evm-backend.onrender.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: electionName,
          maxSelections: maxSelections,
          candidates: candidates
        })
      });

      if (response.ok) {
        setIsElectionActive(true);
        alert('Success! The election is now live in the database.');
      } else if (response.status === 400) {
        // Catch the duplicate name error specifically
        const errorData = await response.json();
        alert(`Failed: ${errorData.message}`);
      } else {
        alert('Failed to save election. Check backend console.');
      }
    } catch (error) {
      console.error('Error saving election:', error);
      alert('Could not connect to the server.');
    } finally {
      setIsSaving(false);
    }
  };

  // NEW: Delete an election from history
  const handleDeleteElection = async (id, name) => {
    if (window.confirm(`Are you sure you want to permanently delete the "${name}" election results?`)) {
      try {
        const response = await fetch(`https://school-election-evm-backend.onrender.com/api/elections/${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          // Instantly remove it from the screen without refreshing the page
          setPastElections(pastElections.filter(election => election._id !== id));
        } else {
          alert('Failed to delete the election.');
        }
      } catch (error) {
        console.error('Error deleting election:', error);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      <header className="flex justify-between items-center py-6 border-b border-gray-200 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Control Center</h1>
          <p className="text-sm text-gray-500 mt-1">Logged in as Master Admin</p>
        </div>
        <button 
          onClick={() => {
            localStorage.removeItem('evm_admin_token');
            localStorage.removeItem('evm_admin_user');
            navigate('/login');
          }}
          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
        >
          Logout
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Setup */}
        <div className="lg:col-span-7 space-y-8">
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Election Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Election Name</label>
                <input 
                  type="text" 
                  value={electionName}
                  onChange={(e) => setElectionName(e.target.value)}
                  disabled={isElectionActive}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Votes per Student</label>
                <input 
                  type="number" 
                  min="1"
                  value={maxSelections}
                  onChange={(e) => setMaxSelections(Number(e.target.value))}
                  disabled={isElectionActive}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-gray-100"
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">2. Manage Candidates</h2>
            <form onSubmit={handleAddCandidate} className="flex gap-4 mb-6">
              <div className="flex-1">
                <input 
                  type="text" 
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  disabled={isElectionActive}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                  placeholder="Candidate Name"
                />
              </div>
              <div className="w-32">
                <input 
                  type="text" 
                  value={candidateSymbol}
                  onChange={(e) => setCandidateSymbol(e.target.value)}
                  disabled={isElectionActive}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                  placeholder="Emoji/URL"
                />
              </div>
              <button 
                type="submit"
                disabled={isElectionActive}
                className="px-6 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400"
              >
                Add
              </button>
            </form>

            <div className="border rounded-lg overflow-hidden">
              {candidates.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No candidates added yet.</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {candidates.map((cand) => (
                    <li key={cand.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <span className="bg-gray-100 w-12 h-12 flex items-center justify-center rounded-full overflow-hidden text-3xl">
                          {cand.symbol.startsWith('http') ? (
                            <img src={cand.symbol} alt={cand.name} className="w-full h-full object-cover" />
                          ) : (
                            cand.symbol
                          )}
                        </span>
                        <span className="font-medium text-gray-900 text-lg">{cand.name}</span>
                      </div>
                      {!isElectionActive && (
                        <button 
                          onClick={() => setCandidates(candidates.filter(c => c.id !== cand.id))}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Actions & History */}
        <div className="lg:col-span-5 space-y-8">
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-t-4 border-t-blue-600">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">3. Election Controls</h2>
            
            <div className="space-y-4">
              {/* Step 1: Initialize Database */}
              {!isElectionActive ? (
                <button 
                  onClick={handleInitializeElection}
                  disabled={!canProceed || isSaving}
                  className={`w-full py-4 text-lg font-semibold rounded-xl transition-colors shadow-sm flex flex-col items-center justify-center ${
                    !canProceed 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isSaving ? 'Saving to Database...' : 'Save & Initialize Election'}
                </button>
              ) : (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-center text-indigo-700 font-medium mb-4">
                  Election is currently active in the database!
                </div>
              )}

              {/* Step 2: Open Interfaces (Only unlock if election is active) */}
              <button 
                onClick={() => navigate('/vote')}
                disabled={!isElectionActive}
                className={`w-full py-4 text-lg font-semibold rounded-xl transition-colors shadow-sm flex flex-col items-center justify-center ${
                  !isElectionActive
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <span>Open Ballot Unit</span>
                <span className={`text-sm font-normal mt-1 ${!isElectionActive ? 'text-gray-500' : 'text-blue-200'}`}>
                  (For the Tablet)
                </span>
              </button>

              <button 
                onClick={() => navigate('/admin/monitor')}
                disabled={!isElectionActive}
                className={`w-full py-4 text-lg font-semibold rounded-xl transition-colors shadow-sm flex flex-col items-center justify-center ${
                  !isElectionActive 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                <span>Open Control Unit</span>
                <span className={`text-sm font-normal mt-1 ${!isElectionActive ? 'text-gray-500' : 'text-emerald-200'}`}>
                  (For the Phone)
                </span>
              </button>

              {!canProceed && !isElectionActive && (
                <p className="text-xs text-red-500 text-center mt-2">
                  * You must add an Election Name and more candidates than the allowed votes to proceed.
                </p>
              )}
            </div>
          </section>

          {/* Past Elections Card */}
          <section className="bg-gray-50 rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Past Elections</h2>
            <div className="space-y-3">
              
              {pastElections.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No completed elections yet.</p>
              ) : (
                pastElections.map((election) => {
                  // Calculate the winner (candidate with the highest votes)
                  const winner = election.candidates.reduce((prev, current) => {
                    return (prev.votes > current.votes) ? prev : current;
                  }, election.candidates[0]); // Default to first candidate if 0 votes

                  return (
                    <div 
                      key={election._id} 
                      onClick={() => navigate(`/admin/results/${election._id}`)}
                      className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-gray-900">{election.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            Completed
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation(); // Prevents opening the results page when deleting
                              handleDeleteElection(election._id, election.name);
                            }}
                            className="text-gray-400 hover:text-red-600 transition-colors z-10"
                            title="Delete this record"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-sm text-gray-500">
                          Total Votes: <span className="font-semibold text-gray-700">{election.totalVotesCast}</span>
                        </p>
                        <p className="text-sm text-blue-600 font-medium hover:underline">
                          View full results →
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}