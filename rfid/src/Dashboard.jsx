import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

function Dashboard({ setIsLoggedIn }) {
  const [scans, setScans] = useState([]);
  const [rfid, setRfid] = useState('');
  const [name, setName] = useState('');
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  // Fetch data from backend
  const fetchData = async () => {
    try {
      const scansResponse = await fetch('http://localhost:5001/api/scans');
      const scansData = await scansResponse.json();
      setScans(scansData);
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to fetch scans' });
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Simulate RFID scan
  const handleScan = async (e) => {
    e.preventDefault();
    if (!rfid || !name) {
      setToast({ type: 'error', message: 'Please enter both RFID and name' });
      return;
    }

    const response = await fetch('http://localhost:5001/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rfid, name })
    });
    const result = await response.json();

    if (result.success) {
      setToast({ type: 'success', message: result.message });
    } else {
      setToast({ type: 'error', message: result.error || 'Scan failed!' });
    }
    setRfid('');
    setName('');
    fetchData();
  };

  // Logout function
  const handleLogout = () => {
    setIsLoggedIn(false);
    navigate('/login');
    setToast({ type: 'success', message: 'Logged out successfully!' });
  };

  // Function to format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    }) + ' ' + date.toLocaleDateString();
  };

  return (
    <div className="App">
      <div className="header">
        <h1>Bus Attendance Monitoring System</h1>
        <button className="logout-btn" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
      
      {/* Simulate RFID Scan */}
      <form onSubmit={handleScan} className="dashboard-form">
        <div className="input-group">
          <i className="fas fa-id-card input-icon"></i>
          <input
            type="text"
            value={rfid}
            onChange={(e) => setRfid(e.target.value)}
            placeholder="Enter RFID (e.g., 123456)"
          />
        </div>
        <div className="input-group">
          <i className="fas fa-user input-icon"></i>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter Student Name"
          />
        </div>
        <button type="submit">
          <i className="fas fa-paper-plane"></i> Scan RFID
        </button>
      </form>

      {/* Display Scans */}
      <h2>Student Scans</h2>
      <table>
        <thead>
          <tr>
            <th>Student Name</th>
            <th>Class</th>
            <th>Boarding Time</th>
            <th>Drop Off Time</th>
            <th>SMS Sent</th>
          </tr>
        </thead>
        <tbody>
          {scans.map((scan) => (
            <tr key={scan.key}>
              <td>{scan.name}</td>
              <td>{scan.class}</td>
              <td>{formatTime(scan.boardingTime)}</td>
              <td>{formatTime(scan.dropOffTime)}</td>
              <td>{scan.smsSent ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default Dashboard;