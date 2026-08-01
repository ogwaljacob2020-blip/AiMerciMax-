// Firebase project configuration for AiMerci Max
// Loaded by every page that needs authentication or cloud storage.
// Must be included AFTER the firebase-app/auth/firestore <script> tags
// and BEFORE script.js.

const firebaseConfig = {
  apiKey: "AIzaSyA3t-fwWFEZf5DmHsDB-XrTjWgBjlaHLfE",
  authDomain: "aimercimax.firebaseapp.com",
  projectId: "aimercimax",
  storageBucket: "aimercimax.firebasestorage.app",
  messagingSenderId: "792673980511",
  appId: "1:792673980511:web:76137abfc3374032d60bea",
  measurementId: "G-P3JHKBYMVE"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
