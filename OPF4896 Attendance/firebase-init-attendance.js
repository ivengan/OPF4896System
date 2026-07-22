// firebase-init-attendance.js
// Dual Firebase Configuration to keep storage/databases 100% separate

const mainConfig = {
    apiKey: "AIzaSyBQAKliT1QN8H-FOuNzvUGArbyQfM_U5MA",
    authDomain: "opf4896system.firebaseapp.com",
    projectId: "opf4896system",
    storageBucket: "opf4896system.firebasestorage.app",
    messagingSenderId: "150864121707",
    appId: "1:150864121707:web:b3161a86514c1d86dd062e"
};

const attendanceConfig = {
    apiKey: "AIzaSyDdJFQnJRhgxQ9Kagi05QEfvCmQiBh1I5g",
    authDomain: "staff-attendance-ofm996.firebaseapp.com",
    projectId: "staff-attendance-ofm996",
    storageBucket: "staff-attendance-ofm996.appspot.com",
    messagingSenderId: "648712051169",
    appId: "1:648712051169:web:811d3daea5f07fbcea9aa0"
};

// 1. Initialize default app for main system (OPF4896System)
if (!firebase.apps.length) {
    firebase.initializeApp(mainConfig);
}

// 2. Initialize named app for attendance system (staff-attendance-ofm996)
let attendanceApp;
try {
    attendanceApp = firebase.app("attendanceApp");
} catch (e) {
    attendanceApp = firebase.initializeApp(attendanceConfig, "attendanceApp");
}

// 3. Make database object globally available under 'db' for attendance scripts,
// while keeping the main system's default database under 'firebase.firestore()' if needed.
var db = attendanceApp.firestore();
var dbMain = firebase.firestore(); // for SSO checks or validations if needed
