const firebaseConfig = {
  apiKey: "AIzaSyDdJFQnJRhgxQ9Kagi05QEfvCmQiBh1I5g",
  authDomain: "staff-attendance-ofm996.firebaseapp.com",
  projectId: "staff-attendance-ofm996",
  storageBucket: "staff-attendance-ofm996.appspot.com",
  messagingSenderId: "648712051169",
  appId: "1:648712051169:web:811d3daea5f07fbcea9aa0",
  measurementId: "G-G0D99C5KTE"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Make the database object globally available.
var db = firebase.firestore();