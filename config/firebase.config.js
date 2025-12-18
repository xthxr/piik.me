const admin = require('firebase-admin');
require('dotenv').config();

let isInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * @returns {boolean} True if initialized successfully
 */
function initializeFirebase() {
  if (isInitialized) {
    return true;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
    console.log('✅ Firebase Admin initialized');
    isInitialized = true;
    return true;
  } catch (error) {
    console.log('⚠️  Firebase Admin not configured. Using in-memory storage.');
    console.log('   See docs/FIREBASE_SETUP.md for setup instructions.');
    return false;
  }
}

/**
 * Get Firestore database instance
 * @returns {admin.firestore.Firestore}
 */
function getDatabase() {
  return admin.firestore();
}

/**
 * Get Firebase Auth instance
 * @returns {admin.auth.Auth}
 */
function getAuth() {
  return admin.auth();
}

/**
 * Firestore collection names
 */
const COLLECTIONS = {
  LINKS: 'links',
  ANALYTICS: 'analytics',
  USERS: 'users'
};

module.exports = {
  initializeFirebase,
  getDatabase,
  getAuth,
  admin,
  COLLECTIONS
};
