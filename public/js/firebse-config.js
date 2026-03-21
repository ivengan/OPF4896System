// D:\OPF4896System\public\js\firebase-config.js

// Prevent duplicate initialization
if (!firebase.apps.length) {
    firebase.initializeApp({
        apiKey: "AIzaSyBQAKliT1QN8H-FOuNzvUGArbyQfM_U5MA",
        authDomain: "opf4896system.firebaseapp.com",
        projectId: "opf4896system",
        storageBucket: "opf4896system.firebasestorage.app", // Fixed bucket URL
        messagingSenderId: "150864121707",
        appId: "1:150864121707:web:b3161a86514c1d86dd062e"
    });
}

const db = firebase.firestore();

// ENABLE OFFLINE PERSISTENCE
// This is critical for a POS system. It allows the app to work 
// even if the WiFi drops in the kitchen or store.
db.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Persistence failed: Multiple tabs open');
        } else if (err.code == 'unimplemented') {
            console.warn('Browser does not support offline storage');
        }
    });