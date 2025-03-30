const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const app = express();
const port=  5001;


const serviceAccount = require('./serviceAccountKey.json'); 
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://rfid-43551-default-rtdb.firebaseio.com/" 
});

const db = admin.database();
app.use(cors());
app.use(express.json());


const initializeStudents = async () => {
  const studentsRef = db.ref('students');
  const snapshot = await studentsRef.once('value');
  if (!snapshot.exists()) {
    const initialStudents = {
      "99220040694": { name: "Haswanth", class: "CSE", parents: ["9515810235", "9515810235"] },
      "9922005312": { name: "Threevickraman", class: "ECE", parents: ["9515810235", "+5566778899"] },
      "9922005319":{name :"Sriram", class:"ECE",parents:["9515810235","9515810235"]},
      "99220040659":{name :"jagadeesh" ,class :"CSE",parents:["9515810235","9515810235"]},
      "99220041329":{name:"rajapandi",class:"CSE",parents:["9515810235","9515810235"]}
    };
    await studentsRef.set(initialStudents);
    console.log("Sample student data initialized in Firebase.");
  }
};


initializeStudents();


const studentStates = {};


app.post('/api/scan', async (req, res) => {
  const { rfid } = req.body;

  if (!rfid) {
    return res.status(400).json({ error: "RFID tag required" });
  }


  const studentSnapshot = await db.ref(`students/${rfid}`).once('value');
  const student = studentSnapshot.val();
  const timestamp = new Date().toISOString();

  if (student) {
    const currentState = studentStates[rfid] || { boarded: false, scanKey: null };
    let scanData;

    if (!currentState.boarded) {
      
      scanData = {
        rfid,
        name: student.name,
        class: student.class,
        boardingTime: timestamp,
        dropOffTime: null,
        smsSent: true
      };
      const newScanRef = db.ref('scans').push();
      await newScanRef.set(scanData);
      
      const message = `Your child ${student.name} (${student.class}) has boarded the bus at ${timestamp}.`;
      student.parents.forEach(parent => console.log(`SMS to ${parent}: ${message}`));
      
      studentStates[rfid] = { boarded: true, scanKey: newScanRef.key };
      res.json({ success: true, message: "Boarded recorded", data: scanData });
    } else {
      
      scanData = {
        dropOffTime: timestamp,
        smsSent: true
      };
      await db.ref(`scans/${currentState.scanKey}`).update(scanData);
      
      const message = `Your child ${student.name} (${student.class}) has reached school at ${timestamp}.`;
      student.parents.forEach(parent => console.log(`SMS to ${parent}: ${message}`));
      
      studentStates[rfid] = { boarded: false, scanKey: null };
      res.json({ success: true, message: "Drop-off recorded", data: scanData });
    }
  } else {
    
    await db.ref('alerts').push({ rfid, timestamp, status: "unknown" });
    console.log("Alert: Unknown RFID scanned - Red LED + Buzzer triggered");
    res.status(403).json({ success: false, message: "Unknown RFID" });
  }
});


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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});