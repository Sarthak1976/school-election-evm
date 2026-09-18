import {useState, useEffect} from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {socket} from './socket';

import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Monitor from './pages/Monitor';
import Vote from './pages/Vote';



function App() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 2. Listen for a successful connection
    socket.on('connect',()=> setIsConnected(true));

    // 3. Listen for a disconnection
    socket.on('disconnect',()=>setIsConnected(false));

    // 4. Cleanup function when component unmounts
    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  return (
    <BrowserRouter>
      <div className={`fixed top-0 left-0 w-full p-1 text-center text-xs text-white z-50 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
        {isConnected ? 'System Online' : 'System Offline - Reconnecting...'}
      </div>

      <div className="pt-6 min-h-screen bg-gray-50">
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/monitor" element={<Monitor />} />
        <Route path="/vote" element={<Vote />} />
        {/* Redirect to login if no route matches */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      </div>
    </BrowserRouter>
  );

}

export default App;