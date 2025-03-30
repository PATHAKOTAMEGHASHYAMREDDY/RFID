import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

function Login({ setIsLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    const staticUsername = 'Haswanth';
    const staticPassword = 'Haswanth12345?67';

    if (username === staticUsername && password === staticPassword) {
      setToast({ type: 'success', message: 'Login successful!' });
      setTimeout(() => {
        setIsLoggedIn(true);
        navigate('/dashboard');
      }, 1000); // Delay to show toast
    } else {
      setError('Invalid username or password');
      setToast({ type: 'error', message: 'Login failed!' });
    }
  };

  return (
    <div className="login-container">
      <h1>Admin Login</h1>
      <form onSubmit={handleLogin} className="login-form">
        <div className="input-group">
          <i className="fas fa-user input-icon"></i>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
        </div>
        <div className="input-group">
          <i className="fas fa-lock input-icon"></i>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <i
            className={`fas ${showPassword ? 'fa-eye' : 'fa-eye-slash'} eye-icon`}
            onClick={() => setShowPassword(!showPassword)}
          ></i>
        </div>
        <button type="submit">Login</button>
        {error && <p className="error">{error}</p>}
      </form>
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default Login;