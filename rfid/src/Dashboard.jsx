import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

function Dashboard({ setIsLoggedIn }) {
  const [attendanceData, setAttendanceData] = useState([]);
  const [rfid, setRfid] = useState('');
  const [name, setName] = useState('');
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();

  // Fetch data from backend
  const fetchData = async () => {
    try {
      // Fetch attendance data from the new endpoint
      const attendanceResponse = await fetch('https://rfid-api.vercel.app/api/attendance');
      const attendanceData = await attendanceResponse.json();
      setAttendanceData(attendanceData);
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to fetch attendance data' });
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
    if (!rfid) {
      setToast({ type: 'error', message: 'Please enter RFID' });
      return;
    }

    const response = await fetch('https://rfid-api.vercel.app/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rfid, name })
    });
    const result = await response.json();

    if (result.success) {
      if (result.cycleCompleted) {
        // Special toast for cycle completion
        setToast({ 
          type: 'success', 
          message: 'Full cycle completed! Starting new cycle.'
        });
      } else {
        setToast({ type: 'success', message: result.message });
      }
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

  // Handle day reset - reset all student cycles
  const handleDayReset = async () => {
    if (isResetting) return;
    
    if (window.confirm('Are you sure you want to reset all student cycles? This will clear all attendance data and start a new day.')) {
      setIsResetting(true);
      
      try {
        // Call the reset-all endpoint which resets everything at once
        const response = await fetch('https://rfid-api.vercel.app/api/reset-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
          setToast({ type: 'success', message: 'All attendance data reset successfully for a new day!' });
        } else {
          setToast({ type: 'error', message: result.error || 'Failed to reset attendance data' });
        }
        
        fetchData(); // Refresh data
      } catch (error) {
        setToast({ type: 'error', message: 'Failed to reset attendance data. Server error.' });
      } finally {
        setIsResetting(false);
      }
    }
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

  // Function to get data from a trip entry
  const getTripData = (tripData, field) => {
    if (!tripData) return '-';
    return tripData[field] || '-';
  };

  // Function to get timestamp tooltip from a trip entry
  const getTripTooltip = (tripData) => {
    if (!tripData) return '';
    return `Time: ${formatTime(tripData.timestamp)}`;
  };

  // Function to render status cell with checkmark or dash
  const renderStatusCell = (tripData) => {
    if (tripData) {
      return (
        <td 
          className="status-cell status-active" 
          title={getTripTooltip(tripData)}
        >
          <i className="fas fa-check-circle"></i>
        </td>
      );
    }
    return <td className="status-cell">-</td>;
  };
  
  // Count students with specific status
  const getStatusCount = (status) => {
    return attendanceData.filter(student => student[status]).length;
  };

  // Filter attendanceData based on search term
  const filteredAttendanceData = attendanceData.filter(student => {
    if (!searchTerm) return true;
    
    const studentInfo = student.boarded_home || student.reached_school || student.boarded_school || student.reached_home;
    if (!studentInfo) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      studentInfo.name?.toLowerCase().includes(searchLower) ||
      studentInfo.dept?.toLowerCase().includes(searchLower) ||
      studentInfo.year?.toLowerCase().includes(searchLower) ||
      studentInfo.section?.toLowerCase().includes(searchLower)
    );
  });

  // Auto-hide toast after a delay
  useEffect(() => {
    if (toast) {
      const timeout = setTimeout(() => {
        setToast(null);
      }, 3000); // Hide toast after 3 seconds
      return () => clearTimeout(timeout);
    }
  }, [toast]);

  return (
    <div className="dashboard-container">
      <nav className="dashboard-header">
        <div className="logo-container">
          <i className="fas fa-bus-alt"></i>
          <h1>Bus Attendance Monitoring System</h1>
        </div>
        <div className="header-actions">
          <button className="day-reset-btn" onClick={handleDayReset} disabled={isResetting}>
            {isResetting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt"></i>} Day Reset
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </nav>
      
      <div className="dashboard-content">
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-icon boarding-home">
              <i className="fas fa-home"></i>
            </div>
            <div className="stat-details">
              <h3>Boarded from Home</h3>
              <p>{getStatusCount('boarded_home')}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon reached-school">
              <i className="fas fa-school"></i>
            </div>
            <div className="stat-details">
              <h3>Reached School</h3>
              <p>{getStatusCount('reached_school')}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon boarding-school">
              <i className="fas fa-bus"></i>
            </div>
            <div className="stat-details">
              <h3>Boarded from School</h3>
              <p>{getStatusCount('boarded_school')}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon reached-home">
              <i className="fas fa-house-user"></i>
            </div>
            <div className="stat-details">
              <h3>Reached Home</h3>
              <p>{getStatusCount('reached_home')}</p>
            </div>
          </div>
        </div>
        
        {/* Simulate RFID Scan */}
        {/* <div className="scan-section">
          <h2><i className="fas fa-id-card"></i> Simulate RFID Scan</h2>
          <form onSubmit={handleScan} className="dashboard-form">
            <div className="input-group">
              <i className="fas fa-id-card input-icon"></i>
              <input
                type="text"
                value={rfid}
                onChange={(e) => setRfid(e.target.value)}
                placeholder="Enter RFID (e.g., 123456)"
                required
              />
            </div>
            <div className="input-group">
              <i className="fas fa-user input-icon"></i>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Student Name (optional)"
              />
            </div>
            <button type="submit" className="scan-button">
              <i className="fas fa-paper-plane"></i> Scan RFID
            </button>
          </form>
        </div> */}

        {/* Display Student Attendance */}
        <div className="attendance-section">
          <div className="attendance-header">
            <h2><i className="fas fa-clipboard-list"></i> Student Attendance</h2>
            <div className="realtime-badge">
              <i className="fas fa-sync-alt fa-spin"></i> Real-time updates
            </div>
          </div>
          
          <div className="search-container">
            <div className="search-input-group">
              <i className="fas fa-search input-icon"></i>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, department, year or section"
              />
              {searchTerm && (
                <button 
                  className="clear-search" 
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          </div>
          
          <div className="table-container">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Department</th>
                  <th>Year</th>
                  <th>Section</th>
                  <th>Boarding From Home</th>
                  <th>Reached School</th>
                  <th>Boarding From School</th>
                  <th>Reached Home</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendanceData.length > 0 ? (
                  filteredAttendanceData.map((student) => (
                    <tr key={student.rfid}>
                      <td>{getTripData(student.boarded_home || student.reached_school || student.boarded_school || student.reached_home, 'name')}</td>
                      <td>{getTripData(student.boarded_home || student.reached_school || student.boarded_school || student.reached_home, 'dept')}</td>
                      <td>{getTripData(student.boarded_home || student.reached_school || student.boarded_school || student.reached_home, 'year')}</td>
                      <td>{getTripData(student.boarded_home || student.reached_school || student.boarded_school || student.reached_home, 'section')}</td>
                      {renderStatusCell(student.boarded_home)}
                      {renderStatusCell(student.reached_school)}
                      {renderStatusCell(student.boarded_school)}
                      {renderStatusCell(student.reached_home)}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="no-data">
                      {searchTerm ? 'No matching students found' : 'No attendance data available'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
          {toast.message}
          <button onClick={() => setToast(null)} className="toast-close">×</button>
        </div>
      )}
    </div>
  );
}

export default Dashboard;