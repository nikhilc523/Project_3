import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './Pages/Login';
import Dashboard from './Pages/Dashboard';

const App = () => {
  const [isLogged, setIsLogged] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);


  useEffect(() => {
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    setUserData(user);
    if (user) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogout = () => {
    setIsLogged(false);
    setUserData(null);
    localStorage.removeItem('user');
  };

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
        <Route path="/dashboard" element={<Dashboard userData={userData}  Logout={handleLogout} />} />

        {/* Default route with redirection */}
        <Route path="/" element={isLogged ? <Navigate to="/dashboard" /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
