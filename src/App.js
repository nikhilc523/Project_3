import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './Pages/Login';
import Dashboard from './Pages/Dashboard';

/**
 * Main application component that handles routing and authentication state
 * @component
 * @returns {JSX.Element} The rendered App component
 */
const App = () => {
  /** @state {boolean} isLogged - Tracks if user is currently logged in */
  const [isLogged, setIsLogged] = useState(false);
  
  /** @state {Object|null} userData - Stores the current user's data */
  const [userData, setUserData] = useState(null);
  
  /** @state {boolean} isLoggedIn - Additional login state tracker */
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  /**
   * Effect hook to check for existing user session on component mount
   * @effect
   */
  useEffect(() => {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    setUserData(user);
    if (user) {
      setIsLoggedIn(true);
    }
  }, []);

  /**
   * Handles user logout by clearing state and local storage
   * @function
   */
  const handleLogout = () => {
    setIsLogged(false);
    setUserData(null);
    localStorage.removeItem('user');
  };

  /**
   * Handles user login by updating state and storing user data
   * @function
   * @param {Object} data - User data received from login
   */
  const handleLogin = (data) => {
    console.log('User data:', data);
    setIsLogged(true);
    setUserData(data);
    localStorage.setItem('user', JSON.stringify(data));
  };

  return (
    <Router>
      <Routes>
        {/* Login Route */}
        <Route
          path="/"
          element={<Login onLogin={(data) => {
            console.log('User data:', data);
            setIsLogged(true);
            handleLogin(data);
          }} 
          />}
        />

        {/* Dashboard Route */}
        <Route path="/dashboard" element={<Dashboard userData={userData} Logout={handleLogout} />} />

        {/* Default route with redirection */}
        <Route path="/" element={isLogged ? <Navigate to="/dashboard" /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
