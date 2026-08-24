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

// Some mobile carriers/proxies (common on certain 4G/H+ networks) block or
// break Firestore's default streaming connection even when raw bandwidth
// is fine, surfacing as a Firestore "unavailable" error. Auto-detecting
// long polling falls back to a plain request/response connection that
// works through those restrictive networks instead.
db.settings({ experimentalAutoDetectLongPolling: true });

// Cache data locally so slow/flaky connections (common on mobile data)
// can still show cached results instantly instead of hanging on every
// read, and queued writes sync automatically once the connection recovers.
db.enablePersistence({ synchronizeTabs: true }).catch(() => {
    // Fails silently in private/incognito mode or multi-tab conflicts -
    // the app still works, just without offline caching.
});
