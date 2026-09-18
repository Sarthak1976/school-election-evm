import {useState, useEffect} from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { socket } from './socket'; 

// Pages
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Monitor from './pages/Monitor';
import Vote from './pages/Vote';
import Results from './pages/Results';

// --- THE BOUNCER: Route Protection ---
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('evm_admin_token');
  
  if (!token) {
    // No token found? Bounce them to the login page.
    return <Navigate to="/login" replace />;
  }
  
  // Token found? Let them in.
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* Public Routes */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        
        {/* The Ballot Unit (Public, but useless without Admin unlocking it) */}
        <Route path="/vote" element={<Vote />} />

        {/* --- SECURE ADMIN ROUTES --- */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/monitor" 
          element={
            <ProtectedRoute>
              <Monitor />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin/results/:id" 
          element={
            <ProtectedRoute>
              <Results />
            </ProtectedRoute>
          } 
        />

        {/* Catch-all: If someone types a random URL, send them to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
        
      </Routes>
    </BrowserRouter>
  );
}

