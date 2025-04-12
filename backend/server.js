const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const app = express();
const port = 5001;

const serviceAccount = require('./serviceAccountKey.json'); 
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://rfid-43551-default-rtdb.firebaseio.com/" 
});

const db = admin.database();
app.use(cors());
app.use(express.json());

// API to handle RFID scans (for web simulation)
app.post('/api/scan', async (req, res) => {
  const { rfid } = req.body;

  if (!rfid) {
    return res.status(400).json({ error: "RFID tag required" });
  }

  const studentSnapshot = await db.ref(`students/${rfid}`).once('value');
  const student = studentSnapshot.val();
  const timestamp = new Date().toISOString();

  if (student) {
    // Get current state of the student (0-3)
    let currentState = student.currentState || 0;
    
    let message = "";
    let tripType = "";
    let cycleCompleted = false;
    
    switch (currentState) {
      case 0:  // At home, boarding to school
        message = `Your child ${student.name} from ${student.section} has boarded the bus from home and is on the way to ${student.college}.`;
        tripType = "boarded_home";
        currentState = 1;
        break;
      case 1:  // Boarded from home, arriving at school
        message = `Your child ${student.name} has arrived at ${student.college} campus.`;
        tripType = "reached_school";
        currentState = 2;
        break;
      case 2:  // At school, boarding to home
        message = `Your child ${student.name} has boarded the bus from ${student.college} and is on the way home.`;
        tripType = "boarded_school";
        currentState = 3;
        break;
      case 3:  // Boarded from school, arriving at home
        message = `Your child ${student.name} has reached home safely.`;
        tripType = "reached_home";
        currentState = 0;  // Reset to initial state for a new cycle
        cycleCompleted = true;
        
        console.log(`Complete cycle finished for student ${student.name}. Starting new cycle.`);
        break;
    }
    
    // Update the student's state in Firebase
    await db.ref(`students/${rfid}`).update({ currentState });
    
    // If the cycle was completed (reached_home → back to start), clear previous attendance data
    if (cycleCompleted) {
      console.log(`Clearing previous attendance data for student ${student.name} to start fresh cycle`);
      // Remove all previous attendance data for this student
      await db.ref(`attendance/${rfid}`).remove();
    }
    
    // Create attendance entry
    const scanData = {
      name: student.name,
      year: student.year || "Unknown",
      dept: student.dept || student.class || "Unknown",
      section: student.section || "Unknown",
      college: student.college || "KARE",
      message: message,
      status: tripType,
      timestamp: timestamp
    };
    
    // Save to the new Firebase structure
    const attendanceRef = db.ref(`attendance/${rfid}/${tripType}`).push();
    await attendanceRef.set(scanData);
    
    // For backward compatibility, also save to scans collection
    const scansData = {
      rfid,
      name: student.name,
      class: student.dept || student.class,
      boardingTime: ["boarded_home", "boarded_school"].includes(tripType) ? timestamp : null,
      dropOffTime: ["reached_school", "reached_home"].includes(tripType) ? timestamp : null,
      smsSent: true,
      status: tripType
    };
    
    // Add to scans collection
    const newScanRef = db.ref('scans').push();
    await newScanRef.set(scansData);
    
    // Simulate SMS notification (just log to console)
    student.parents?.forEach(parent => console.log(`SMS to ${parent}: ${message}`));
    
    // Additional message if cycle was completed
    let responseMessage = `${tripType.replace('_', ' ')} recorded`;
    if (cycleCompleted) {
      responseMessage = `${tripType.replace('_', ' ')} recorded. Full cycle completed, starting new cycle.`;
    }
    
    res.json({ success: true, message: responseMessage, data: scanData, cycleCompleted });
  } else {
    await db.ref('alerts').push({ rfid, timestamp, status: "unknown" });
    console.log("Alert: Unknown RFID scanned - Red LED + Buzzer triggered");
    res.status(403).json({ success: false, message: "Unknown RFID" });
  }
});

// API to get all student attendance data
app.get('/api/attendance', async (req, res) => {
  const snapshot = await db.ref('attendance').once('value');
  const data = snapshot.val();
  
  if (!data) return res.json([]);
  
  // Process data into a format suitable for frontend
  const attendanceList = [];
  
  Object.entries(data).forEach(([rfid, tripTypes]) => {
    // Get latest entries for each trip type
    const studentData = {
      rfid,
      boarded_home: null,
      reached_school: null,
      boarded_school: null,
      reached_home: null
    };
    
    Object.entries(tripTypes).forEach(([tripType, events]) => {
      if (events) {
        // Get latest entry for this trip type
        const latestKey = Object.keys(events).sort().pop();
        if (latestKey) {
          studentData[tripType] = {
            ...events[latestKey],
            key: latestKey
          };
        }
      }
    });
    
    attendanceList.push(studentData);
  });
  
  res.json(attendanceList);
});

// API to reset a student's cycle
app.post('/api/reset-cycle', async (req, res) => {
  const { rfid } = req.body;

  if (!rfid) {
    return res.status(400).json({ error: "RFID tag required" });
  }

  try {
    const studentSnapshot = await db.ref(`students/${rfid}`).once('value');
    const student = studentSnapshot.val();
    
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }
    
    // Reset student state to 0 (at home)
    await db.ref(`students/${rfid}`).update({ currentState: 0 });
    
    // Clear all attendance data for this student to start fresh
    await db.ref(`attendance/${rfid}`).remove();
    
    res.json({ 
      success: true, 
      message: `Cycle reset for student ${student.name}. All attendance data cleared.`,
      student: {
        name: student.name,
        currentState: 0
      }
    });
  } catch (error) {
    console.error('Error resetting student cycle:', error);
    res.status(500).json({ error: "Failed to reset student cycle" });
  }
});

// Legacy API to fetch all scans
app.get('/api/scans', async (req, res) => {
  const snapshot = await db.ref('scans').once('value');
  const data = snapshot.val();
  const scanList = data ? Object.entries(data).map(([key, value]) => ({ key, ...value })) : [];
  res.json(scanList);
});

// API to fetch all alerts
app.get('/api/alerts', async (req, res) => {
  const snapshot = await db.ref('alerts').once('value');
  const data = snapshot.val();
  const alertList = data ? Object.values(data) : [];
  res.json(alertList);
});

// API to reset all attendance data (Day Reset)
app.post('/api/reset-all', async (req, res) => {
  try {
    // Remove all attendance data
    await db.ref('attendance').remove();
    
    // Reset all students to state 0 (at home)
    const studentsSnapshot = await db.ref('students').once('value');
    const students = studentsSnapshot.val();
    
    if (students) {
      const updates = {};
      Object.keys(students).forEach(rfid => {
        updates[`students/${rfid}/currentState`] = 0;
      });
      
      // Update all students at once
      await db.ref().update(updates);
    }
    
    console.log('Day reset completed: All attendance data cleared and students reset to state 0');
    res.json({ 
      success: true, 
      message: 'All attendance data cleared and students reset to state 0'
    });
  } catch (error) {
    console.error('Error during day reset:', error);
    res.status(500).json({ error: "Failed to reset attendance data" });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});