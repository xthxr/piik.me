// Firebase Client Configuration
// This will use environment variables in production (Vercel)
// or fallback to hardcoded values for local development

const firebaseConfig = {
  apiKey: "AIzaSyAVHcF6OxRqpl2lUF3GnxumlNNcmhVEi1M",
  authDomain: "zaplink-a234d.firebaseapp.com",
  projectId: "zaplink-a234d",
  storageBucket: "zaplink-a234d.firebasestorage.app",
  messagingSenderId: "737715033373",
  appId: "1:737715033373:web:e45138bafa82f9e6617df4",
  measurementId: "G-ZFNDKD46L3"
};

// Initialize Firebase
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  // Initialize services
  const auth = firebase.auth();
  const db = firebase.firestore();

  // Configure Google Auth Provider
  const googleProvider = new firebase.auth.GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });

  console.log('✅ Firebase client initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Firebase client:', error);
  alert('Failed to initialize Firebase. Please check your internet connection and reload the page.');
}
