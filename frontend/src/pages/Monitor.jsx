import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket'; 

export default function Monitor() {
  const navigate = useNavigate();
  
  const [tabletStatus, setTabletStatus] = useState('locked'); 
  const [totalVotes, setTotalVotes] = useState(0);

  // GRAB THE SECURE TOKEN
  const token = localStorage.getItem('evm_admin_token');

  useEffect(() => {
    const fetchActiveStats = async () => {
      try {
        const response = await fetch('https://school-election-evm-backend.onrender.com/api/elections/active', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setTotalVotes(data.totalVotesCast); 
        }
      } catch (error) {
        console.error('Error fetching initial stats:', error);
      }
    };
    
    if (token) {
      socket.emit('join_admin_room', token); // ADD THIS LINE
      fetchActiveStats();
    }

    socket.on('voter_finished', () => {
      setTabletStatus('locked');
      setTotalVotes((prev) => prev + 1); 
    });

    return () => {
      socket.off('voter_finished');
    };
  }, [token]);

  const handleAllowNext = () => {
    setTabletStatus('voting');
    socket.emit('admin_unlock_tablet');
  };

  const handleDiscardVote = () => {
    if (window.confirm("Are you sure you want to discard the current student's vote?")) {
      setTabletStatus('locked');
      socket.emit('admin_discard_vote');
    }
  };

  const handleEndElection = async () => {
    if (window.confirm("CRITICAL WARNING: Are you sure you want to permanently end this election?")) {
      try {
        const response = await fetch('https://school-election-evm-backend.onrender.com/api/elections/end', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json(); 
          alert("Election ended successfully! Generating results...");
          socket.emit('admin_discard_vote'); 
          
          navigate(`/admin/results/${data.election._id}`, { replace: true });
        } else {
          alert("Failed to end election. Check connection.");
        }
      } catch (error) {
        console.error("Error ending election:", error);
      }
    }
  };
  
  return (
    <div className="max-w-md mx-auto px-4 py-8 min-h-screen flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Live Election</h1>
        <div className="px-3 py-1 bg-gray-900 text-white text-sm font-bold rounded-full shadow-sm">
          Votes Cast: {totalVotes}
        </div>
      </div>

      <div className={`p-6 rounded-2xl mb-8 border-2 transition-all duration-300 ${
        tabletStatus === 'locked' 
          ? 'bg-amber-50 border-amber-200' 
          : 'bg-emerald-50 border-emerald-200'
      }`}>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Booth Status</h2>
        
        {tabletStatus === 'locked' ? (
          <div>
            <p className="text-2xl font-bold text-amber-700">Booth is Locked</p>
            <p className="text-sm text-amber-600 mt-1">Ready for the next voter.</p>
          </div>
        ) : (
          <div>
            <p className="text-2xl font-bold text-emerald-700 animate-pulse">Voting in Progress...</p>
            <p className="text-sm text-emerald-600 mt-1">Student is currently inside.</p>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-4">
        <button 
          onClick={handleAllowNext}
          disabled={tabletStatus === 'voting'}
          className={`w-full py-6 rounded-2xl text-xl font-bold shadow-sm transition-all ${
            tabletStatus === 'voting'
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
          }`}
        >
          {tabletStatus === 'voting' ? 'Waiting for Student...' : 'Allow Next Voter'}
        </button>

        <button 
          onClick={handleDiscardVote}
          disabled={tabletStatus === 'locked'}
          className={`w-full py-4 rounded-xl text-lg font-bold shadow-sm transition-all ${
            tabletStatus === 'locked'
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
              : 'bg-red-100 text-red-600 hover:bg-red-200 active:scale-95'
          }`}
        >
          Discard Current Vote
        </button>
      </div>

      <div className="mt-12 pt-6 border-t border-gray-200">
        <button 
          onClick={handleEndElection}
          className="w-full py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-black transition-colors"
        >
          End Election Permanently
        </button>
      </div>
    </div>
  );
}