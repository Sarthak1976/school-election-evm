import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [election, setElection] = useState(null);

  useEffect(() => {
    const fetchElectionDetails = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/elections/${id}`);
        if (response.ok) {
          setElection(await response.json());
        }
      } catch (error) {
        console.error("Error fetching results:", error);
      }
    };
    fetchElectionDetails();
  }, [id]);

  if (!election) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-xl font-medium">Loading Results...</div>;
  }

  // 1. Sort ALL candidates by votes (Highest to Lowest)
  const sortedCandidates = [...election.candidates].sort((a, b) => b.votes - a.votes);
  
  // 2. Split into Winners and Remaining
  const topWinners = sortedCandidates.slice(0, election.maxSelections);
  const remainingCandidates = sortedCandidates.slice(election.maxSelections);

  // 3. Calculate the Winning Symbol with strict tie-breaker logic
  const symbolCounts = {};
  let maxCount = 0;
  // Default to the 1st place candidate's symbol
  let winningSymbol = topWinners.length > 0 ? topWinners[0].symbol : ''; 

  // Count the frequencies
  topWinners.forEach(cand => {
    symbolCounts[cand.symbol] = (symbolCounts[cand.symbol] || 0) + 1;
  });

  // Because topWinners is sorted highest-to-lowest, checking > ensures that 
  // in a tie, the symbol attached to the candidate with more votes keeps the crown.
  for (const cand of topWinners) {
    if (symbolCounts[cand.symbol] > maxCount) {
      maxCount = symbolCounts[cand.symbol];
      winningSymbol = cand.symbol;
    }
  }

  const renderSymbol = (symbol, sizeClasses) => {
    if (!symbol) return null;
    return symbol.startsWith('http') ? (
      <img src={symbol} alt="symbol" className={`${sizeClasses} object-cover rounded-full shadow-sm`} />
    ) : (
      <span className={sizeClasses}>{symbol}</span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      
      {/* Header & Go Back */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{election.name}</h1>
          <p className="text-gray-500 mt-1">Total Votes Cast: {election.totalVotesCast}</p>
        </div>
        <button 
          onClick={() => navigate('/admin')}
          className="px-6 py-3 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-colors shadow-sm"
        >
          Return to Dashboard
        </button>
      </div>

      {/* Winning Symbol Banner */}
      {election.totalVotesCast > 0 && (
        <div className="bg-gradient-to-r from-amber-100 to-yellow-300 rounded-2xl p-6 md:p-8 mb-12 shadow-sm flex items-center justify-between border border-yellow-400">
          <div>
            <h2 className="text-sm font-bold text-yellow-800 uppercase tracking-wider mb-1">Overall Winning Symbol</h2>
            <p className="text-yellow-900 text-sm md:text-base">Based on majority presence in the Top {election.maxSelections}.</p>
          </div>
          <div className="bg-white w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center shadow-lg text-5xl md:text-7xl shrink-0 ml-4">
            {renderSymbol(winningSymbol, "w-full h-full flex items-center justify-center")}
          </div>
        </div>
      )}

      {/* BIG CARDS: Top Winners */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          🏆 Top {election.maxSelections} Candidates
        </h2>
        <div className="space-y-4">
          {topWinners.map((cand, index) => (
            <div key={cand._id} className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 md:p-8 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 md:gap-8">
                <div className="text-3xl md:text-4xl font-black text-blue-300 w-12">
                  #{index + 1}
                </div>
                <div className="bg-white w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-4xl md:text-5xl shrink-0 shadow-inner border border-gray-100">
                  {renderSymbol(cand.symbol, "w-full h-full flex items-center justify-center")}
                </div>
                <div>
                  <span className="font-bold text-gray-900 text-2xl md:text-3xl block">{cand.name}</span>
                  <span className="inline-block mt-2 text-xs font-bold px-3 py-1 bg-blue-200 text-blue-800 rounded-full">
                    Winner
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-4xl md:text-5xl font-black text-gray-900 block">{cand.votes}</span>
                <p className="text-sm md:text-base text-gray-500 font-medium uppercase tracking-wider mt-1">votes</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SMALL LIST: Remaining Candidates */}
      {remainingCandidates.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-600 mb-4 px-2">
            Remaining Candidates
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {remainingCandidates.map((cand, index) => (
                <li key={cand._id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-lg font-bold text-gray-400 w-8 text-center">
                      #{election.maxSelections + index + 1}
                    </div>
                    <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0">
                      {renderSymbol(cand.symbol, "w-full h-full flex items-center justify-center")}
                    </div>
                    <span className="font-semibold text-gray-700 text-lg">{cand.name}</span>
                  </div>
                  <div className="text-right pr-2">
                    <span className="text-xl font-bold text-gray-600">{cand.votes}</span>
                    <span className="text-xs text-gray-400 ml-1">votes</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

    </div>
  );
}