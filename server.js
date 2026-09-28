const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { nanoid } = require('nanoid');
const admin = require('firebase-admin');

// Use the native fetch when available (Node 18+); fall back to node-fetch for
// older runtimes. A single declaration replaces the two separate const fetch
// assignments that previously caused SyntaxError: Identifier 'fetch' has
// already been declared when Node.js parsed the file.

const fetch = typeof globalThis.fetch === 'function'
  ? globalThis.fetch
  : (...args) => import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args));
const checkLinkHealth = require('./src/utils/checkLinkHealth');
const redisUtils = require('./src/utils/redis.utils');
const redirectCache = require('./src/utils/redirect-cache.utils');
const { securityHeaders, apiLimiter, bugReportLimiter } = require('./src/middleware/security.middleware');
const splitTestService = require('./src/services/splitTest.service');
const geoip = require('geoip-lite');

/**
 * Perform IP Geolocation lookup
 * @param {string} ip - IP address to lookup
 * @returns {object} Geolocation data containing country, city, region, and ll (latitude/longitude)
 */
function getGeoFromIP(ip) {
  if (!ip) return { country: 'Unknown', city: 'Unknown', region: 'Unknown', ll: null };
  const cleanIP = ip.replace('::ffff:', '');
  if (cleanIP === '127.0.0.1' || cleanIP === '::1' || cleanIP === 'localhost') {
    return { country: 'Local', city: 'Local', region: 'Loopback', ll: [0, 0] };
  }
  const geo = geoip.lookup(cleanIP);
  if (!geo) return { country: 'Unknown', city: 'Unknown', region: 'Unknown', ll: null };
  return {
    country: geo.country || 'Unknown',
    city: geo.city || 'Unknown',
    region: geo.region || 'Unknown',
    ll: geo.ll || null
  };
}
require('dotenv').config();

// Validate required environment variables on startup
function validateEnv() {
  const required = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'SESSION_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('FATAL: Missing required environment variables:');
    missing.forEach(key => console.error(`  - ${key}`));
    console.error('\nThe server cannot start without these variables.');
    console.error('Copy .env.example to .env and fill in the values.');
    process.exit(1);
  }
  if (process.env.SESSION_SECRET.length < 32) {
    console.error('FATAL: SESSION_SECRET must be at least 32 characters long for security.');
    console.error('Generate a secure random string (e.g., using openssl rand -hex 32).');
    process.exit(1);
  }
}

validateEnv();

// Initialize Firebase Admin

let db = null;

let auth = null;
// Firebase state tracking

const firebaseState = {
  enabled: false,
  mode: 'memory',
  reason: 'Firebase not initialized'
};

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });

  db = admin.firestore();
  auth = admin.auth();
  firebaseState.enabled = true;
firebaseState.mode = 'firestore';
firebaseState.reason = 'Firebase connected successfully';


  
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.log('⚠️ Firebase Admin not configured. Using in-memory storage.');
  console.log('   See FIREBASE_SETUP.md for setup instructions.');
}

const app = express();
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const server = isServerless ? null : http.createServer(app);

// Restrict Socket.IO CORS to the configured application origin.
// Falls back to the same ALLOWED_ORIGIN used for the Express CORS middleware
// so both share a single configuration point in the environment.

const allowedOrigin = process.env.ALLOWED_ORIGIN || false;
const io = isServerless
  ? { emit: () => {} }
  : socketIo(server, {
      cors: {
        origin: allowedOrigin,
        methods: ["GET", "POST"]
      }
    });

// Helper function to convert shortCode to Firestore-safe document ID
// Firestore document IDs cannot contain '/' so we replace with '_'

function toFirestoreId(shortCode) {
  return shortCode.replace(/\//g, '_');
}

// Helper function to convert Firestore ID back to shortCode

function fromFirestoreId(firestoreId) {

  // Keep as-is, shortCode field in the document has the original format

  return firestoreId;
}

// Middleware

app.use(securityHeaders);
app.use(apiLimiter);

// Restrict CORS to the configured application origin.
// Without an origin restriction, any third-party website can make credentialed
// cross-origin requests to the API. Set ALLOWED_ORIGIN in the environment to
// the production front-end URL (e.g. https://piik.me). When unset, cross-origin
// requests are blocked entirely (origin: false) rather than allowed for all.

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || false,
  credentials: true,
}));
app.use(express.json());
app.use(express.static('public', { index: false }));
app.use((req, res, next) => {
  req.firebase = { ...firebaseState };
  res.setHeader('X-Firebase-Mode', firebaseState.mode);
  next();
});

// Firestore Collections

const COLLECTIONS = {
  LINKS: 'links',
  ANALYTICS: 'analytics',
  USERS: 'users',
  BIO_LINKS: 'bioLinks'
};

// Helper to aggregate distributed analytics shards

async function getAggregatedAnalytics(firestoreId) {
  const baseDoc = await db.collection(COLLECTIONS.ANALYTICS).doc(firestoreId).get();
  let data = baseDoc.exists ? baseDoc.data() : {};

  try {
    const shardsSnapshot = await db.collection(COLLECTIONS.ANALYTICS).doc(firestoreId).collection('shards').get();
    
    shardsSnapshot.forEach(shard => {
      const s = shard.data();
      data.clicks = (data.clicks || 0) + (s.clicks || 0);
      data.impressions = (data.impressions || 0) + (s.impressions || 0);
      data.shares = (data.shares || 0) + (s.shares || 0);

      // Merge nested objects dynamically

      const mergeNested = (key) => {
        if (!s[key]) return;
        if (!data[key]) data[key] = {};
        for (const [k, v] of Object.entries(s[key])) {
          data[key][k] = (data[key][k] || 0) + v;
        }
      };

      ['devices', 'browsers', 'referrers', 'countries', 'locations', 'variantClicks'].forEach(mergeNested);
    });
  } catch (err) {
    console.error("Error reading shards:", err);
  }

  return data;
}

// Middleware to verify Firebase token

async function verifyToken(req, res, next) {

  // If Firebase Auth is not available, reject with clear message

  if (!auth) {
    return res.status(503).json({ 
      error: 'Authentication service unavailable. Please configure Firebase.' 
    });
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await auth.verifyIdToken(token, true);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/api/system/status', (req, res) => {
  res.json({
    success: true,
    firebase: {
      enabled: firebaseState.enabled,
      mode: firebaseState.mode,
      reason: firebaseState.reason
    }
  });
});

// In-memory database (fallback if Firebase not configured)

const links = new Map();
const analytics = new Map();

// Generate short code

function generateShortCode() {
  return nanoid(7);
}

// Parse UTM parameters from URL

function parseUTMParams(url) {
  try {
    const urlObj = new URL(url);
    return {
      source: urlObj.searchParams.get('utm_source') || '',
      medium: urlObj.searchParams.get('utm_medium') || '',
      campaign: urlObj.searchParams.get('utm_campaign') || '',
      term: urlObj.searchParams.get('utm_term') || '',
      content: urlObj.searchParams.get('utm_content') || ''
    };
  } catch (e) {
    return null;
  }
}

// Add UTM parameters to URL

function addUTMParams(url, utmParams) {
  try {
    const urlObj = new URL(url);
    if (utmParams.source) urlObj.searchParams.set('utm_source', utmParams.source);
    if (utmParams.medium) urlObj.searchParams.set('utm_medium', utmParams.medium);
    if (utmParams.campaign) urlObj.searchParams.set('utm_campaign', utmParams.campaign);
    if (utmParams.term) urlObj.searchParams.set('utm_term', utmParams.term);
    if (utmParams.content) urlObj.searchParams.set('utm_content', utmParams.content);
    return urlObj.toString();
  } catch (e) {
    return null;
  }
}

async function resolveLinkForRedirect(shortCode) {
  const cachedLink = await redirectCache.get(shortCode);
  if (cachedLink) {
    return { link: cachedLink, cacheStatus: 'hit' };
  }

  if (db) {
    try {
      const firestoreId = toFirestoreId(shortCode);
      const linkDoc = await db.collection(COLLECTIONS.LINKS).doc(firestoreId).get();
      if (linkDoc.exists) {
        const link = normalizeRedirectLink(linkDoc.data());
        await redirectCache.set(shortCode, link);
        return { link, cacheStatus: 'miss' };
      }
    } catch (error) {
      console.error('Error reading link from Firestore:', error);
    }
  }

  const fallbackLink = links.get(shortCode);
  if (fallbackLink) {
    const normalizedLink = normalizeRedirectLink(fallbackLink);
    await redirectCache.set(shortCode, normalizedLink);
    return { link: normalizedLink, cacheStatus: 'miss' };
  }

  return { link: null, cacheStatus: 'miss' };
}

function normalizeRedirectLink(linkData) {
  if (!linkData) {
    return null;
  }

  return {
    originalUrl: linkData.originalUrl,
    shortCode: linkData.shortCode || '',
    userId: linkData.userId || '',
    isActive: linkData.isActive !== false,
    title: linkData.title || '',
    splitTest: linkData.splitTest || false,
    variants: linkData.variants || [],
    expiresAt: linkData.expiresAt ? (typeof linkData.expiresAt.toDate === 'function' ? linkData.expiresAt.toDate().toISOString() : linkData.expiresAt) : null,
  };
}

async function resolveBioLinkStatus(shortCode) {
  const cacheKey = `bio-link:${shortCode}`;
  const cachedStatus = await redirectCache.get(cacheKey);

  if (cachedStatus && typeof cachedStatus.exists === 'boolean') {
    return cachedStatus;
  }

  if (!db) {
    return { exists: false };
  }

  try {
    const bioLinkDoc = await db.collection('bioLinks').where('slug', '==', shortCode).limit(1).get();
    const status = { exists: !bioLinkDoc.empty };
    await redirectCache.set(cacheKey, status);
    return status;
  } catch (error) {
    console.error('Error checking bio link:', error);
    return { exists: false };
  }
}

// API Routes

// Helper function to get base URL from request

function getBaseUrl(req) {

  // Try Vercel-specific headers first

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  
  // Use environment variable if set, otherwise construct from request

  if (process.env.BASE_URL && process.env.BASE_URL !== 'undefined') {
    return process.env.BASE_URL;
  }
  
  return `${protocol}://${host}`;
}

// Create short link (requires authentication)

app.post('/api/shorten', verifyToken, async (req, res) => {
  const {
  url,
  utmParams,
  customShortCode,
  username,
  notes,
  tags
} = req.body;
  const userId = req.user.uid;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Validate URL structure and block dangerous schemes.
  // new URL() only checks syntactic correctness; it accepts javascript:, data:,
  // vbscript:, and other schemes that are unsafe as redirect destinations.
  // Enforce an explicit allowlist so only http and https links can be shortened.

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only http and https URLs are allowed' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Block dangerous URL schemes

  const blockedSchemes = ['javascript:', 'data:', 'vbscript:'];
  const urlLower = url.toLowerCase();
  for (const scheme of blockedSchemes) {
    if (urlLower.startsWith(scheme)) {
      return res.status(400).json({ error: 'Invalid URL: dangerous URL scheme blocked' });
    }
  }

  // Validate custom short code if provided

  let shortCode;
  if (customShortCode) {
    const trimmedCode = customShortCode.trim();
    
    // Validate format

    if (trimmedCode.length < 3) {
      return res.status(400).json({ error: 'Custom short code must be at least 3 characters' });
    }
    
    if (trimmedCode.length > 50) {
      return res.status(400).json({ error: 'Custom short code must be less than 50 characters' });
    }
    
    if (!/^[a-zA-Z0-9-_]+$/.test(trimmedCode)) {
      return res.status(400).json({ error: 'Custom short code can only contain letters, numbers, hyphens, and underscores' });
    }
    
    // If username is provided, create username/slug format

    if (username) {
      shortCode = `${username}/${trimmedCode}`;
    } else {
      shortCode = trimmedCode;
    }
    
    // Check if already exists in Firestore

    try {
      const firestoreId = toFirestoreId(shortCode);
      const existingDoc = await db.collection(COLLECTIONS.LINKS).doc(firestoreId).get();
      if (existingDoc.exists) {
        return res.status(409).json({ error: 'This custom short code is already taken' });
      }
    } catch (error) {
      console.error('Error checking custom short code:', error);
    }
    
    // Check in-memory storage as fallback

    if (links.has(shortCode)) {
      return res.status(409).json({ error: 'This custom short code is already taken' });
    }
  } else {

    // Generate random short code

    const randomCode = generateShortCode();

    // If username is provided, prefix random codes with username too

    if (username) {
      shortCode = `${username}/${randomCode}`;
    } else {
      shortCode = randomCode;
    }
  }

  // Add UTM parameters if provided

  let finalUrl = url;
  if (utmParams) {
    const urlWithUTM = addUTMParams(url, utmParams);
    if (urlWithUTM) {
      finalUrl = urlWithUTM;
    }
  }
  const healthData = await checkLinkHealth(finalUrl);
  const baseUrl = getBaseUrl(req);
  const shortUrl = `${baseUrl}/${shortCode}`;
  
  // Store link data

  const { expiresAt, maxClicks } = req.body;

  const linkData = {
  originalUrl: finalUrl,
  shortCode,
  shortUrl,
  userId,
  userEmail: req.user.email || '',

  notes: notes || '',
  tags: Array.isArray(tags) ? tags : [],

  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  utmParams: parseUTMParams(finalUrl) || utmParams || {},
  isCustom: !!customShortCode,
  isActive: true,
  expiresAt: expiresAt ? admin.firestore.Timestamp.fromDate(new Date(expiresAt)) : null,
  maxClicks: maxClicks ? parseInt(maxClicks, 10) : null,
  clickCount: 0,
  notifiedExpiry: false,
  isExpired: false
};
  const analyticsData = {
    impressions: 0,
    clicks: 0,
    shares: 0,
    clickHistory: [],
    devices: {},
    browsers: {},
    countries: {},
    locations: {},
    referrers: {}
  };

  try {
    // Convert shortCode to Firestore-safe ID (replace / with _)

    const firestoreId = toFirestoreId(shortCode);
    
    // Save to Firestore

    console.log('Saving link to Firestore:', { shortCode, firestoreId, userId, linkData });
    await db.collection(COLLECTIONS.LINKS).doc(firestoreId).set(linkData);
    console.log('Link saved successfully to Firestore');
    
    await db.collection(COLLECTIONS.ANALYTICS).doc(firestoreId).set(analyticsData);
    console.log('Analytics saved successfully to Firestore');
    
    // Sync to Redis for edge redirects

    await redisUtils.storeLinkInRedis(shortCode, {
      destination: finalUrl,
      userId: userId,
      createdAt: Date.now(),
      title: linkData.title || '',
    });
    await redirectCache.set(shortCode, normalizeRedirectLink(linkData));
    
    // Verify the save by reading it back

    const verifyDoc = await db.collection(COLLECTIONS.LINKS).doc(firestoreId).get();
    if (verifyDoc.exists) {
      console.log('✅ Verified link exists in Firestore:', verifyDoc.data());
    } else {
      console.error('❌ Link was not found after save!');
    }
    
    res.json({
      success: true,
      shortUrl,
      shortCode,
      originalUrl: finalUrl,
      isCustom: !!customShortCode
    });
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    
    // Fallback to in-memory storagehealthStatus

    links.set(shortCode, linkData);
    analytics.set(shortCode, analyticsData);
    await redirectCache.set(shortCode, normalizeRedirectLink(linkData));
    
    res.json({
      success: true,
      shortUrl,
      shortCode,
      originalUrl: finalUrl,
      isCustom: !!customShortCode
    });
  }
});

// Get aggregated analytics for all of the authenticated user's links

app.get('/api/user/analytics', verifyToken, async (req, res) => {
  const userId = req.user.uid;

  if (!db) {
    return res.status(503).json({ error: 'Firestore not available' });
  }

  try {
    const linksSnapshot = await db.collection(COLLECTIONS.LINKS)
      .where('userId', '==', userId)
      .get();

    const linksData = [];
    linksSnapshot.forEach(doc => {
      const data = doc.data();
      linksData.push({ id: doc.id, ...data });
    });

    // Fetch analytics for each link

    const analyticsPromises = linksData.map(async (link) => {
      const firestoreId = toFirestoreId(link.shortCode);
      try {
        const analyticsDoc = await db.collection(COLLECTIONS.ANALYTICS).doc(firestoreId).get();
        return {
          shortCode: link.shortCode,
          linkData: link,
          analytics: analyticsDoc.exists ? analyticsDoc.data() : null
        };
      } catch (err) {
        return { shortCode: link.shortCode, linkData: link, analytics: null };
      }
    });

    const analyticsData = await Promise.all(analyticsPromises);

    res.json({ success: true, data: analyticsData });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get analytics for a short link

app.get('/api/analytics/:shortCode', verifyToken, async (req, res) => {
  const { shortCode } = req.params;
  const userId = req.user.uid;
  
  try {
    // Try Firestore first

    const firestoreId = toFirestoreId(shortCode);
    const linkDoc = await db.collection(COLLECTIONS.LINKS).doc(firestoreId).get();
    
    if (linkDoc.exists) {
      const linkData = linkDoc.data();
      if (linkData.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Use aggregated analytics from shards

      const aggregatedStats = await getAggregatedAnalytics(firestoreId);
      return res.json({
        link: linkData,
        analytics: aggregatedStats
      });
    }
  } catch (error) {
    console.error('Error reading from Firestore:', error);
  }
  
  // Fallback to in-memory storage

  const link = links.get(shortCode);
  const stats = analytics.get(shortCode);
  
  if (!link || !stats) {
    return res.status(404).json({ error: 'Link not found' });
  }

  if (link.userId !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json({
    link,
    analytics: stats
  });
});

// Get a single link by shortCode with ownership verification
app.get('/api/links/:shortCode', verifyToken, async (req, res) => {
  let { shortCode } = req.params;
  shortCode = decodeURIComponent(shortCode);
  const userId = req.user.uid;

  try {
    const firestoreId = toFirestoreId(shortCode);
    const linkRef = db.collection(COLLECTIONS.LINKS).doc(firestoreId);
    const linkDoc = await linkRef.get();

    if (linkDoc.exists) {
      const linkData = linkDoc.data();
      if (linkData.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      return res.json({ success: true, link: { id: linkDoc.id, ...linkData } });
    }
  } catch (error) {
    console.error('Error reading from Firestore:', error);
  }

  const linkData = links.get(shortCode);
  if (!linkData) {
    return res.status(404).json({ error: 'Link not found' });
  }
  if (linkData.userId !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json({ success: true, link: linkData });
});

// Check if username is available

app.get('/api/check-username/:username', verifyToken, async (req, res) => {
  const { username } = req.params;
  
  try {
    // Check if username meets requirements

    if (username.length < 3 || username.length > 20) {
      return res.json({ available: false, error: 'Username must be 3-20 characters' });
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.json({ available: false, error: 'Username can only contain letters, numbers, hyphens, and underscores' });
    }
    
    const usersSnapshot = await db.collection(COLLECTIONS.USERS)
      .where('username', '==', username)
      .limit(1)
      .get();
    
    res.json({ available: usersSnapshot.empty });
  } catch (error) {
    console.error('Error checking username:', error);
    res.json({ available: false, error: 'Error checking username' });
  }
});

// Check if shortcode is available

app.get('/api/check-shortcode/:shortCode', verifyToken, async (req, res) => {
  const { shortCode } = req.params;
  
  try {
    const firestoreId = toFirestoreId(shortCode);
    const doc = await db.collection(COLLECTIONS.LINKS).doc(firestoreId).get();
    res.json({ available: !doc.exists });
  } catch (error) {
    console.error('Error checking shortcode:', error);
    res.json({ available: true }); // Assume available if check fails
  }
});

// Get or create user profile

app.get('/api/user/profile', verifyToken, async (req, res) => {
  const userId = req.user.uid;
  
  try {
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
    
    if (userDoc.exists) {
      res.json({ profile: userDoc.data() });
    } else {
      // Create new user profile

      const newProfile = {
        userId,
        email: req.user.email,
        username: null,
        usernameChangedAt: null,
        canChangeUsername: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection(COLLECTIONS.USERS).doc(userId).set(newProfile);
      res.json({ profile: newProfile });
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Set or update username (can only be changed once)

app.post('/api/user/username', verifyToken, async (req, res) => {
  const userId = req.user.uid;
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  // Validate username

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be 3-20 characters' });
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, hyphens, and underscores' });
  }
  
  try {
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
    const userData = userDoc.data();
    
    // Check if user can change username

    if (userData && userData.username && !userData.canChangeUsername) {
      return res.status(403).json({ error: 'Username can only be changed once' });
    }
    
    // Check if username is available

    const usersSnapshot = await db.collection(COLLECTIONS.USERS)
      .where('username', '==', username)
      .limit(1)
      .get();
    
    if (!usersSnapshot.empty) {
      const existingUser = usersSnapshot.docs[0];
      if (existingUser.id !== userId) {
        return res.status(409).json({ error: 'Username is already taken' });
      }
    }
    
    // Update username

    const updateData = {
      username,
      usernameChangedAt: admin.firestore.FieldValue.serverTimestamp(),
      canChangeUsername: userData && userData.username ? false : true
    };
    
    await db.collection(COLLECTIONS.USERS).doc(userId).update(updateData);
    
    res.json({ 
      success: true, 
      username,
      canChangeUsername: updateData.canChangeUsername
    });
  } catch (error) {
    console.error('Error updating username:', error);
    res.status(500).json({ error: 'Failed to update username' });
  }
});

// Get user's bio slug (requires authentication) - DEPRECATED, use profile instead

app.get('/api/user/bio-slug', verifyToken, async (req, res) => {
  const userId = req.user.uid;
  
  try {
    // First check user profile for username

    const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
    if (userDoc.exists && userDoc.data().username) {
      return res.json({ slug: userDoc.data().username });
    }
    
    // Fallback to bioLinks for backward compatibility

    const bioLinksSnapshot = await db.collection('bioLinks')
      .where('userId', '==', userId)
      .limit(1)
      .get();
    
    if (!bioLinksSnapshot.empty) {
      const bioLink = bioLinksSnapshot.docs[0].data();
      res.json({ slug: bioLink.slug || null });
    } else {
      res.json({ slug: null });
    }
  } catch (error) {
    console.error('Error fetching bio slug:', error);
    res.json({ slug: null });
  }
});

// ================================
// BIO-LINKS API
// ================================

// GET /api/bio-links/check-slug/:slug - Check if a slug is available

app.get('/api/bio-links/check-slug/:slug', verifyToken, async (req, res) => {
  const { slug } = req.params;
  
  try {
    const existingSlug = await db.collection(COLLECTIONS.BIO_LINKS)
      .where('slug', '==', slug)
      .get();
    
    res.json({ available: existingSlug.empty });
  } catch (error) {
    console.error('Error checking slug:', error);
    res.status(500).json({ error: 'Failed to check slug availability' });
  }
});

// GET /api/bio-links - Fetch all bio links for authenticated user

app.get('/api/bio-links', verifyToken, async (req, res) => {
  const userId = req.user.uid;
  
  try {
    const snapshot = await db.collection(COLLECTIONS.BIO_LINKS)
      .where('userId', '==', userId)
      .get();
    
    const bioLinks = [];
    snapshot.forEach(doc => {
      bioLinks.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by createdAt descending

    bioLinks.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });
    
    res.json({ success: true, bioLinks });
  } catch (error) {
    console.error('Error fetching bio links:', error);
    res.status(500).json({ error: 'Failed to fetch bio links' });
  }
});

// POST /api/bio-links - Create a new bio link

app.post('/api/bio-links', verifyToken, async (req, res) => {
  const userId = req.user.uid;
  const { name, slug, description, profilePicture, themeColor, backgroundStyle, links, social } = req.body;
  
  // Validation
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!slug || !/^[a-zA-Z0-9-_]+$/.test(slug)) {
    return res.status(400).json({ error: 'Invalid slug format' });
  }
  
  try {
    // Check if slug is available

    const existingSlug = await db.collection(COLLECTIONS.BIO_LINKS)
      .where('slug', '==', slug)
      .get();
    
    if (!existingSlug.empty) {
      return res.status(409).json({ error: 'This URL slug is already taken' });
    }
    
    // Check if user already has a bio link

    const userBioLinks = await db.collection(COLLECTIONS.BIO_LINKS)
      .where('userId', '==', userId)
      .get();
    
    if (!userBioLinks.empty) {
      return res.status(409).json({ error: 'You can only create one bio link. Please edit your existing one.' });
    }
    
    const bioLinkData = {
      userId,
      name: name.trim(),
      slug,
      description: description || '',
      profilePicture: profilePicture || '',
      themeColor: themeColor || '#06b6d4',
      backgroundStyle: backgroundStyle || 'gradient',
      links: links || [],
      social: social || {},
      views: 0,
      clicks: 0,
      verified: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection(COLLECTIONS.BIO_LINKS).add(bioLinkData);
    
    res.status(201).json({ success: true, id: docRef.id, message: 'Bio link created successfully' });
  } catch (error) {
    console.error('Error creating bio link:', error);
    res.status(500).json({ error: 'Failed to create bio link' });
  }
});

// PUT /api/bio-links/:id - Update a bio link

app.put('/api/bio-links/:id', verifyToken, async (req, res) => {
  const userId = req.user.uid;
  const { id } = req.params;
  const { name, slug, description, profilePicture, themeColor, backgroundStyle, links, social } = req.body;
  
  // Validation

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!slug || !/^[a-zA-Z0-9-_]+$/.test(slug)) {
    return res.status(400).json({ error: 'Invalid slug format' });
  }
  
  try {
    const bioLinkRef = db.collection(COLLECTIONS.BIO_LINKS).doc(id);
    const bioLinkDoc = await bioLinkRef.get();
    
    if (!bioLinkDoc.exists) {
      return res.status(404).json({ error: 'Bio link not found' });
    }
    
    const bioLinkData = bioLinkDoc.data();
    
    // Verify ownership

    if (bioLinkData.userId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to update this bio link' });
    }
    
    // Check slug availability if changed

    if (slug !== bioLinkData.slug) {
      const existingSlug = await db.collection(COLLECTIONS.BIO_LINKS)
        .where('slug', '==', slug)
        .get();
      
      if (!existingSlug.empty) {
        return res.status(409).json({ error: 'This URL slug is already taken' });
      }
    }
    
    const updateData = {
      name: name.trim(),
      slug,
      description: description || '',
      profilePicture: profilePicture || '',
      themeColor: themeColor || '#06b6d4',
      backgroundStyle: backgroundStyle || 'gradient',
      links: links || [],
      social: social || {},
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await bioLinkRef.update(updateData);
    
    res.json({ success: true, message: 'Bio link updated successfully' });
  } catch (error) {
    console.error('Error updating bio link:', error);
    res.status(500).json({ error: 'Failed to update bio link' });
  }
});

// DELETE /api/bio-links/:id - Delete a bio link

app.delete('/api/bio-links/:id', verifyToken, async (req, res) => {
  const userId = req.user.uid;
  const { id } = req.params;
  
  try {
    const bioLinkRef = db.collection(COLLECTIONS.BIO_LINKS).doc(id);
    const bioLinkDoc = await bioLinkRef.get();
    
    if (!bioLinkDoc.exists) {
      return res.status(404).json({ error: 'Bio link not found' });
    }
    
    const bioLinkData = bioLinkDoc.data();
    
    // Verify ownership

    if (bioLinkData.userId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this bio link' });
    }
    
    await bioLinkRef.delete();
    
    res.json({ success: true, message: 'Bio link deleted successfully' });
  } catch (error) {
    console.error('Error deleting bio link:', error);
    res.status(500).json({ error: 'Failed to delete bio link' });
  }
});

// Get all links for a user (requires authentication)

app.get('/api/user/links', verifyToken, async (req, res) => {
  const userId = req.user.uid;
  
  console.log(`🔍 Fetching links for user: ${userId}`);
  
  try {
    // Try with orderBy first

    let linksSnapshot;
    try {
      linksSnapshot = await db.collection(COLLECTIONS.LINKS)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      console.log(`Found ${linksSnapshot.docs.length} links with orderBy`);
    } catch (orderError) {

      // If orderBy fails (missing index), try without it

      console.log('OrderBy failed, trying without ordering:', orderError.message);
      linksSnapshot = await db.collection(COLLECTIONS.LINKS)
        .where('userId', '==', userId)
        .get();
      console.log(`Found ${linksSnapshot.docs.length} links without orderBy`);
    }
    
    const userLinks = [];
    
    for (const doc of linksSnapshot.docs) {
			const linkData = doc.data();
			

// Auto-delete inactive links whose scheduledDeletion date has passed

			const now = admin.firestore.Timestamp.now();
      const isInactive = linkData.isActive === false;
      const scheduled = linkData.scheduledDeletion;

      if (isInactive && scheduled && scheduled.toMillis() <= now.toMillis()) {
        await db
          .collection(COLLECTIONS.LINKS)
          .doc(doc.id)
          .delete()
          .catch(() => {});
        await db
          .collection(COLLECTIONS.ANALYTICS)
          .doc(doc.id)
          .delete()
          .catch(() => {});
        continue;
      }

      // Auto-deactivate on expiry

      const nowDate = new Date();
      const dateExpired = linkData.expiresAt && linkData.expiresAt.toDate && linkData.expiresAt.toDate() < nowDate;
      const clickExpired = linkData.maxClicks && (linkData.clickCount || 0) >= linkData.maxClicks;
      if ((dateExpired || clickExpired) && linkData.isActive !== false) {
        await db.collection(COLLECTIONS.LINKS).doc(doc.id).update({ isActive: false, isExpired: true }).catch(() => {});
        linkData.isActive = false;
      }

      console.log(`Processing link: ${doc.id}`, { shortCode: linkData.shortCode, isActive: linkData.isActive });
      
      // Use aggregated analytics from shards

      const analyticsData = await getAggregatedAnalytics(doc.id);
      
      userLinks.push({
        ...linkData,
        clicks: analyticsData.clicks || 0,
        analytics: analyticsData,
        id: doc.id
      });
    }
    
    // Sort by createdAt in JavaScript if we couldn't use orderBy

    userLinks.sort((a, b) => {
      const dateA = a.createdAt?._seconds ? new Date(a.createdAt._seconds * 1000) : new Date(0);
      const dateB = b.createdAt?._seconds ? new Date(b.createdAt._seconds * 1000) : new Date(0);
      return dateB - dateA;
    });
    
    console.log(`✅ Returning ${userLinks.length} links for user ${userId}`);
    res.json({ links: userLinks });
  } catch (error) {
    console.error('Error fetching user links:', error);
    res.status(500).json({ error: 'Failed to fetch links', details: error.message });
  }
});

// Delete a user account (requires authentication)

app.delete('/api/user', verifyToken, async (req, res) => {
  const userId = req.user.uid;
  
  try {
    if (db) {
      const linksSnapshot = await db.collection(COLLECTIONS.LINKS)
                                    .where('userId', '==', userId).get();

      const batch = db.batch();
      linksSnapshot.docs.forEach(doc => {
          batch.delete(db.collection(COLLECTIONS.LINKS).doc(doc.id));
          batch.delete(db.collection(COLLECTIONS.ANALYTICS).doc(doc.id));
      });

      batch.delete(db.collection(COLLECTIONS.USERS).doc(userId));
      await batch.commit();

      if (admin.apps.length > 0) {
        await admin.auth().deleteUser(userId);
      }
    }
    
    res.json({ success: true, message: 'Account permanently deleted' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Get link details by shortCode (requires authentication and ownership)
app.get('/api/links/:shortCode', verifyToken, async (req, res) => {
  let { shortCode } = req.params;
  shortCode = decodeURIComponent(shortCode);
  const userId = req.user.uid;

  try {
    const firestoreId = toFirestoreId(shortCode);

    if (db) {
      const linkRef = db.collection(COLLECTIONS.LINKS).doc(firestoreId);
      const linkDoc = await linkRef.get();

      if (!linkDoc.exists) {
        return res.status(404).json({ error: 'Link not found' });
      }

      const linkData = linkDoc.data();

      // Verify ownership
      if (linkData.userId !== userId) {
        return res.status(403).json({ error: 'You do not have permission to view this link' });
      }

      return res.json({ success: true, link: { id: linkDoc.id, ...linkData } });
    }

    // In-memory fallback
    const linkData = links.get(shortCode);

    if (!linkData) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Verify ownership
    if (linkData.userId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to view this link' });
    }

    return res.json({ success: true, link: linkData });
  } catch (error) {
    console.error('Error fetching link:', error);
    res.status(500).json({ error: 'Failed to fetch link', details: error.message });
  }
});

// Deactivate a link (soft delete — marks as inactive with scheduled permanent deletion)

app.put('/api/links/:shortCode/deactivate', verifyToken, async (req, res) => {
  let { shortCode } = req.params;
  shortCode = decodeURIComponent(shortCode);
  const userId = req.user.uid;

  try {
    const firestoreId = toFirestoreId(shortCode);
    const linkRef = db.collection(COLLECTIONS.LINKS).doc(firestoreId);
    const linkDoc = await linkRef.get();

    if (!linkDoc.exists) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const linkData = linkDoc.data();

    // Verify ownership

    if (linkData.userId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to deactivate this link' });
    }

    const deactivationDate = new Date();
    const permanentDeletionDate = new Date();
    permanentDeletionDate.setDate(permanentDeletionDate.getDate() + 15);

    await linkRef.update({
      isActive: false,
      deactivatedAt: deactivationDate,
      scheduledDeletion: permanentDeletionDate
    });

    // Clear cache

    await redisUtils.deleteLinkFromRedis(shortCode);
    await redirectCache.delete(shortCode);

    res.json({ success: true, message: 'Link deactivated. Will be permanently deleted in 15 days.' });
  } catch (error) {
    console.error('Error deactivating link:', error);
    res.status(500).json({ error: 'Failed to deactivate link' });
  }
});

// Reactivate a deactivated link

app.put('/api/links/:shortCode/reactivate', verifyToken, async (req, res) => {
  let { shortCode } = req.params;
  shortCode = decodeURIComponent(shortCode);
  const userId = req.user.uid;

  try {
    const firestoreId = toFirestoreId(shortCode);
    const linkRef = db.collection(COLLECTIONS.LINKS).doc(firestoreId);
    const linkDoc = await linkRef.get();

    if (!linkDoc.exists) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const linkData = linkDoc.data();

    // Verify ownership

    if (linkData.userId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to reactivate this link' });
    }

    await linkRef.update({
      isActive: true,
      deactivatedAt: admin.firestore.FieldValue.delete(),
      scheduledDeletion: admin.firestore.FieldValue.delete()
    });

    // Restore in Redis

    await redisUtils.storeLinkInRedis(shortCode, { ...linkData, isActive: true });

    res.json({ success: true, message: 'Link reactivated successfully' });
  } catch (error) {
    console.error('Error reactivating link:', error);
    res.status(500).json({ error: 'Failed to reactivate link' });
  }
});

// Permanently delete all inactive links for the authenticated user

app.delete('/api/links/inactive', verifyToken, async (req, res) => {
  const userId = req.user.uid;

  try {
    const inactiveLinksQuery = await db.collection(COLLECTIONS.LINKS)
      .where('userId', '==', userId)
      .where('isActive', '==', false)
      .get();

    if (inactiveLinksQuery.empty) {
      return res.json({ success: true, message: 'No inactive links to delete', count: 0 });
    }

    const BATCH_LIMIT = 400;
    let count = 0;
    let currentBatch = db.batch();
    let batchOps = 0;

    for (const doc of inactiveLinksQuery.docs) {
      const data = doc.data();
      const shortCode = data.shortCode;
      if (!shortCode) continue;

      // Delete link document

      currentBatch.delete(doc.ref);
      batchOps++;

      // Delete associated analytics document

      const firestoreId = toFirestoreId(shortCode);
      const analyticsRef = db.collection(COLLECTIONS.ANALYTICS).doc(firestoreId);
      currentBatch.delete(analyticsRef);
      batchOps++;

      // Clear cache

      await redisUtils.deleteLinkFromRedis(shortCode).catch(() => {});
      await redirectCache.delete(shortCode).catch(() => {});

      count++;

      // Firestore batch limit is 500 — commit + refresh at 400 to stay safe

      if (batchOps >= BATCH_LIMIT) {
        await currentBatch.commit();
        currentBatch = db.batch();
        batchOps = 0;
      }
    }

    // Commit remaining batch

    if (batchOps > 0) {
      await currentBatch.commit();
    }

    res.json({ success: true, message: `Successfully deleted ${count} inactive link${count > 1 ? 's' : ''}`, count });
  } catch (error) {
    console.error('Error deleting inactive links:', error);
    res.status(500).json({ error: 'Failed to delete inactive links' });
  }
});

// Delete a single link by shortCode (requires authentication and ownership)

app.delete('/api/links/:shortCode', verifyToken, async (req, res) => {
  let { shortCode } = req.params;

  // Decode URL-encoded shortCode (e.g., atharcloud%2Ftuf -> atharcloud/tuf)

  shortCode = decodeURIComponent(shortCode);
  const userId = req.user.uid;
  
  try {

    // Convert to Firestore-safe ID

    const firestoreId = toFirestoreId(shortCode);
    const linkRef = db.collection(COLLECTIONS.LINKS).doc(firestoreId);
    const linkDoc = await linkRef.get();
    
    if (!linkDoc.exists) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    const linkData = linkDoc.data();
    
    // Verify ownership

    if (linkData.userId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this link' });
    }
    
    // Delete the link

    await linkRef.delete();
    
    // Delete associated analytics

    const analyticsRef = db.collection(COLLECTIONS.ANALYTICS).doc(firestoreId);
    await analyticsRef.delete();
    
    // Delete from Redis

    await redisUtils.deleteLinkFromRedis(shortCode);
    await redirectCache.delete(shortCode);
    
    res.json({ success: true, message: 'Link deleted successfully' });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: 'Failed to delete link', details: error.message });
  }
});

// Edit link metadata (title, notes, tags, expiresAt)
app.patch('/api/links/:shortCode', verifyToken, async (req, res) => {
  let { shortCode } = req.params;
  shortCode = decodeURIComponent(shortCode);
  const userId = req.user.uid;
  const { title, notes, tags, expiresAt } = req.body;

  if (title === undefined && notes === undefined && tags === undefined && expiresAt === undefined) {
    return res.status(400).json({ error: 'At least one field (title, notes, tags, expiresAt) must be provided' });
  }

  try {
    const firestoreId = toFirestoreId(shortCode);
    const linkRef = db.collection(COLLECTIONS.LINKS).doc(firestoreId);
    const linkDoc = await linkRef.get();

    if (!linkDoc.exists) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const linkData = linkDoc.data();

    if (linkData.userId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to edit this link' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (notes !== undefined) updateData.notes = notes;
    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return res.status(400).json({ error: 'tags must be an array' });
      }
      updateData.tags = tags;
    }
    if (expiresAt !== undefined) {
      if (expiresAt !== null) {
        const parsed = new Date(expiresAt);
        if (isNaN(parsed.getTime())) {
          return res.status(400).json({ error: 'expiresAt must be a valid ISO date string' });
        }
        updateData.expiresAt = admin.firestore.Timestamp.fromDate(parsed);
      } else {
        updateData.expiresAt = null;
      }
    }

    await linkRef.update(updateData);

    await redisUtils.deleteLinkFromRedis(shortCode);
    await redirectCache.delete(shortCode);

    res.json({ success: true, message: 'Link updated successfully' });
  } catch (error) {
    console.error('Error updating link:', error);
    res.status(500).json({ error: 'Failed to update link' });
  }
});

// Configure split-test for a link

app.post('/api/links/:shortCode/split-test', verifyToken, async (req, res) => {
  let { shortCode } = req.params;
  shortCode = decodeURIComponent(shortCode);
  const userId = req.user.uid;
  const { variants } = req.body;

  // Validate variants using the splitTestService

  const validation = splitTestService.validateVariants(variants);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.message });
  }

  const normalised = splitTestService.normaliseVariants(variants);

  try {
    const firestoreId = toFirestoreId(shortCode);
    if (db) {
      const linkRef = db.collection(COLLECTIONS.LINKS).doc(firestoreId);
      const linkDoc = await linkRef.get();

      if (!linkDoc.exists) {
        return res.status(404).json({ error: 'Link not found' });
      }

      const linkData = linkDoc.data();
      if (linkData.userId !== userId) {
        return res.status(403).json({ error: 'You do not have permission to modify this link' });
      }

      await linkRef.update({
        splitTest: true,
        variants: normalised
      });

      // Clear cache so changes take effect immediately

      await redisUtils.deleteLinkFromRedis(shortCode);
      await redirectCache.delete(shortCode);

      return res.json({ success: true, message: 'Split test configured successfully' });
    } else {

      // In-memory fallback

      const linkData = links.get(shortCode);
      if (!linkData) {
        return res.status(404).json({ error: 'Link not found' });
      }
      if (linkData.userId !== userId) {
        return res.status(403).json({ error: 'You do not have permission to modify this link' });
      }

      linkData.splitTest = true;
      linkData.variants = normalised;
      links.set(shortCode, linkData);

      await redirectCache.delete(shortCode);

      return res.json({ success: true, message: 'Split test configured successfully' });
    }
  } catch (error) {
    console.error('Error configuring split test:', error);
    res.status(500).json({ error: 'Failed to configure split test', details: error.message });
  }
});

// Remove split-test configuration from a link

app.delete('/api/links/:shortCode/split-test', verifyToken, async (req, res) => {
  let { shortCode } = req.params;
  shortCode = decodeURIComponent(shortCode);
  const userId = req.user.uid;

  try {
    const firestoreId = toFirestoreId(shortCode);
    if (db) {
      const linkRef = db.collection(COLLECTIONS.LINKS).doc(firestoreId);
      const linkDoc = await linkRef.get();

      if (!linkDoc.exists) {
        return res.status(404).json({ error: 'Link not found' });
      }

      const linkData = linkDoc.data();
      if (linkData.userId !== userId) {
        return res.status(403).json({ error: 'You do not have permission to modify this link' });
      }

      await linkRef.update({
        splitTest: false,
        variants: admin.firestore.FieldValue.delete()
      });

      // Clear cache so changes take effect immediately

      await redisUtils.deleteLinkFromRedis(shortCode);
      await redirectCache.delete(shortCode);

      return res.json({ success: true, message: 'Split test removed successfully' });
    } else {

      // In-memory fallback

      const linkData = links.get(shortCode);
      if (!linkData) {
        return res.status(404).json({ error: 'Link not found' });
      }
      if (linkData.userId !== userId) {
        return res.status(403).json({ error: 'You do not have permission to modify this link' });
      }

      linkData.splitTest = false;
      delete linkData.variants;
      links.set(shortCode, linkData);

      await redirectCache.delete(shortCode);

      return res.json({ success: true, message: 'Split test removed successfully' });
    }
  } catch (error) {
    console.error('Error removing split test:', error);
    res.status(500).json({ error: 'Failed to remove split test', details: error.message });
  }
});

// Track impression (when analytics page is viewed)

app.post('/api/track/impression/:shortCode', async (req, res) => {
  let { shortCode } = req.params;
  shortCode = decodeURIComponent(shortCode);
  
  try {
    const firestoreId = toFirestoreId(shortCode);
    const analyticsRef = db.collection(COLLECTIONS.ANALYTICS).doc(firestoreId);
    const doc = await analyticsRef.get();
    
    if (doc.exists) {

      // Use distributed counter: write to a random shard

      const NUM_SHARDS = 10;
      const shardId = Math.floor(Math.random() * NUM_SHARDS).toString();
      const shardRef = analyticsRef.collection('shards').doc(shardId);
      await shardRef.set({
        impressions: admin.firestore.FieldValue.increment(1)
      }, { merge: true });
      
      const stats = { impressions: 1 };
      
      // Emit real-time update

      io.emit(`analytics:${shortCode}`, {
        type: 'impression',
        data: stats
      });
      
      return res.json({ success: true });
    }
  } catch (error) {
    console.error('Error tracking impression:', error);
  }
  
  // Fallback to in-memory

  const stats = analytics.get(shortCode);
  if (stats) {
    stats.impressions++;
    analytics.set(shortCode, stats);
    
    io.emit(`analytics:${shortCode}`, {
      type: 'impression',
      data: stats
    });
    
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Link not found' });
  }
});

// Track share (deprecated - now tracked automatically via UTM parameters)
// Keeping endpoint for backward compatibility but shares are counted on click with UTM

app.post('/api/track/share/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  // Shares are now tracked automatically when links with utm_source are clicked
  // No need to manually increment here

  res.json({ success: true, message: 'Shares tracked via UTM parameters' });
});

// Create GitHub Issue for Bug Report (requires authentication + strict rate limit)

app.post('/api/bug-report', verifyToken, bugReportLimiter, async (req, res) => {
  try {
    const { title, description, steps, email, userId, userEmail } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    
    // Create issue body

    let issueBody = `## Bug Description\n${description}\n\n`;
    
    if (steps) {
      issueBody += `## Steps to Reproduce\n${steps}\n\n`;
    }
    
    issueBody += `## Reporter Information\n`;
    if (email) issueBody += `- Email: ${email}\n`;
    if (userId) issueBody += `- User ID: ${userId}\n`;
    if (userEmail) issueBody += `- User Email: ${userEmail}\n`;
    issueBody += `- Browser: ${req.headers['user-agent']}\n`;
    issueBody += `- Timestamp: ${new Date().toISOString()}\n`;
    
    // Create GitHub issue using fetch

    const response = await fetch('https://api.github.com/repos/xthxr/Link360/issues', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'Link360-Bug-Reporter'
      },
      body: JSON.stringify({
        title: `[Bug Report] ${title}`,
        body: issueBody,
        labels: ['bug', 'user-reported']
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('GitHub API Error:', errorData);
      throw new Error('Failed to create GitHub issue');
    }
    
    const issue = await response.json();
    
    res.json({ 
      success: true, 
      issueNumber: issue.number,
      issueUrl: issue.html_url 
    });
  } catch (error) {
    console.error('Bug report error:', error);
    res.status(500).json({ 
      error: 'Failed to create bug report',
      details: error.message
    });
  }
});

// Proxy endpoint for importing from Linktree/Bento

app.post('/api/import-profile', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // SSRF Protection: Allow-list for trusted domains only

    const allowedDomains = [
      'https://linktr.ee/',
      'https://bento.me/'
    ];
    
    const isAllowed = allowedDomains.some(domain => url.startsWith(domain));
    
    if (!isAllowed) {
      console.warn('⚠️  Blocked SSRF attempt:', url);
      return res.status(403).json({ 
        error: 'Invalid URL',
        message: 'Only Linktree (linktr.ee) and Bento (bento.me) profiles can be imported'
      });
    }
    
    console.log('Fetching profile from:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Failed to fetch profile',
        status: response.status
      });
    }
    
    const html = await response.text();
    
    res.json({ 
      success: true,
      html: html
    });
  } catch (error) {
    console.error('Import profile error:', error);
    res.status(500).json({ 
      error: 'Failed to import profile',
      details: error.message 
    });
  }
});

// Catch-all route for client-side routing
// This ensures all app routes (/home, /analytics, /profile, /login, /register) serve the index.html
// Must be BEFORE the /:shortCode route to avoid conflicts

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

app.get(['/login', '/register', '/signup', '/home', '/analytics', '/profile', '/qr-generator', '/bio-link', '/dashboard'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Track impression without redirect (for link previews - HEAD request)

app.head('/:shortCode', async (req, res) => {
  let { shortCode } = req.params;
  shortCode = decodeURIComponent(shortCode);
  
  try {
    const firestoreId = toFirestoreId(shortCode);
    const analyticsRef = db.collection(COLLECTIONS.ANALYTICS).doc(firestoreId);
    const doc = await analyticsRef.get();
    
    if (doc.exists) {

      // Use distributed counter: write to a random shard

      const NUM_SHARDS = 10;
      const shardId = Math.floor(Math.random() * NUM_SHARDS).toString();
      const shardRef = analyticsRef.collection('shards').doc(shardId);
      await shardRef.set({
        impressions: admin.firestore.FieldValue.increment(1)
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error tracking impression:', error);
  }
  
  res.status(200).end();
});

// Helper to extract device type from user-agent

function getDeviceType(userAgent) {
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
  return isMobile ? 'Mobile' : 'Desktop';
}

// Helper to extract browser type from user-agent

function getBrowserType(userAgent) {
  let browser = 'Other';
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('instagram')) browser = 'Instagram App';
  else if (ua.includes('whatsapp')) browser = 'WhatsApp';
  else if (ua.includes('fb_iab') || ua.includes('fbav')) browser = 'Facebook App';
  else if (ua.includes('twitter')) browser = 'Twitter App';
  else if (ua.includes('linkedin')) browser = 'LinkedIn App';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';
  
  return browser;
}

// Helper to get referrer source

function getReferrerSource(req) {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const httpReferrer = req.headers['referer'] || req.headers['referrer'] || '';
  const utmSource = req.query.utm_source;
  
  let referrerSource;
  
  if (utmSource) {
    referrerSource = utmSource.charAt(0).toUpperCase() + utmSource.slice(1);
  } else if (httpReferrer) {
    try {
      const refUrl = new URL(httpReferrer);
      const hostname = refUrl.hostname.toLowerCase().replace('www.', '');
      
      if (hostname.includes('google')) referrerSource = 'Google';
      else if (hostname.includes('facebook') || hostname.includes('fb.com')) referrerSource = 'Facebook';
      else if (hostname.includes('instagram')) referrerSource = 'Instagram';
      else if (hostname.includes('twitter') || hostname.includes('t.co')) referrerSource = 'X (formerly Twitter)';
      else if (hostname.includes('linkedin')) referrerSource = 'LinkedIn';
      else if (hostname.includes('reddit')) referrerSource = 'Reddit';
      else if (hostname.includes('tiktok')) referrerSource = 'TikTok';
      else if (hostname.includes('youtube')) referrerSource = 'YouTube';
      else if (hostname.includes('pinterest')) referrerSource = 'Pinterest';
      else if (hostname.includes('whatsapp')) referrerSource = 'WhatsApp';
      else if (hostname.includes('telegram')) referrerSource = 'Telegram';
      else if (hostname.includes('discord')) referrerSource = 'Discord';
      else if (hostname.includes('slack')) referrerSource = 'Slack';
      else referrerSource = hostname;
    } catch (e) {
      referrerSource = httpReferrer;
    }
  } else {
    const ua = userAgent.toLowerCase();
    if (ua.includes('whatsapp')) referrerSource = 'WhatsApp';
    else if (ua.includes('instagram')) referrerSource = 'Instagram';
    else if (ua.includes('fbav') || ua.includes('fban') || ua.includes('fb_iab')) referrerSource = 'Facebook';
    else if (ua.includes('twitter')) referrerSource = 'X (formerly Twitter)';
    else if (ua.includes('linkedin')) referrerSource = 'LinkedIn';
    else if (ua.includes('snapchat')) referrerSource = 'Snapchat';
    else if (ua.includes('tiktok')) referrerSource = 'TikTok';
    else if (ua.includes('telegram')) referrerSource = 'Telegram';
    else if (ua.includes('line/')) referrerSource = 'LINE';
    else if (ua.includes('kakaotalk')) referrerSource = 'KakaoTalk';
    else if (ua.includes('wechat')) referrerSource = 'WeChat';
    else referrerSource = 'Unknown';
  }
  
  return referrerSource;
}

// Fetch geolocation data

async function fetchGeolocation(clientIP) {
  try {
    const geo = getGeoFromIP(clientIP);
    return {
      country: geo.country,
      city: geo.city,
      region: geo.region,
      ll: geo.ll
    };
  } catch (geoError) {
    console.log('Geolocation lookup failed:', geoError.message);
    return {
      country: 'Unknown',
      city: 'Unknown',
      region: 'Unknown',
      ll: null
    };
  }
}

// Core click-tracking and DB write function

async function trackClickAndEmit(shortCode, req, variantLabel = null) {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const utmSource = req.query.utm_source;
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress || 
                   'unknown';
                   
  const deviceType = getDeviceType(userAgent);
  const browser = getBrowserType(userAgent);
  const referrerSource = getReferrerSource(req);
  const locationData = await fetchGeolocation(clientIP);
  const locationKey = `${locationData.city}, ${locationData.region}`;
  
  const clickData = {
    timestamp: new Date().toISOString(),
    device: deviceType,
    browser,
    referrer: referrerSource,
    userAgent: userAgent.substring(0, 200),
    isShared: !!utmSource,
    location: locationData,
    ipAddress: clientIP
  };
  
  if (variantLabel) {
    clickData.variantLabel = variantLabel;
  }

  try {
    if (db) {
      const firestoreId = toFirestoreId(shortCode);
      const analyticsRef = db.collection(COLLECTIONS.ANALYTICS).doc(firestoreId);
      
      const doc = await analyticsRef.get();
      if (doc.exists) {

        // Add to clicks sub-collection

        const clickRef = analyticsRef.collection('clicks').doc();
        await clickRef.set(clickData);
        
        // Build the update object

        const updateData = {
          impressions: admin.firestore.FieldValue.increment(1),
          clicks: admin.firestore.FieldValue.increment(1),
          [`devices.${deviceType}`]: admin.firestore.FieldValue.increment(1),
          [`browsers.${browser}`]: admin.firestore.FieldValue.increment(1),
          [`referrers.${referrerSource}`]: admin.firestore.FieldValue.increment(1),
          [`countries.${locationData.country}`]: admin.firestore.FieldValue.increment(1),
          [`locations.${locationKey}`]: admin.firestore.FieldValue.increment(1)
        };

        if (utmSource) {
          updateData.shares = admin.firestore.FieldValue.increment(1);
        }

        if (variantLabel) {
          const safeLabel = String(variantLabel).replace(/[.[\]]/g, '_');
          updateData[`variantClicks.${safeLabel}`] = admin.firestore.FieldValue.increment(1);
        }

        // Distributed counter: Write to a random shard instead of the main document

        const NUM_SHARDS = 10;
        const shardId = Math.floor(Math.random() * NUM_SHARDS).toString();
        const shardRef = analyticsRef.collection('shards').doc(shardId);
        await shardRef.set(updateData, { merge: true });
        
        // For real-time Socket.io updates, send the increment data to avoid expensive shard reads

        const stats = updateData;
        
        // Emit real-time update

        io.emit(`analytics:${shortCode}`, {
          type: 'click',
          data: stats
        });

        // Always emit the generic analyticsUpdate

        io.emit('analyticsUpdate', {
          shortCode,
          click: clickData
        });

        if (variantLabel) {
          io.emit('splitTestUpdate', {
            shortCode,
            variantLabel,
            click: clickData
          });
        }
      }
    } else {

      // In-memory fallback

      if (!analytics.has(shortCode)) {
        analytics.set(shortCode, {
          impressions: 0,
          clicks: 0,
          shares: 0,
          clickHistory: [],
          devices: {},
          browsers: {},
          countries: {},
          locations: {},
          referrers: {},
          variantClicks: {}
        });
      }
      
      const stats = analytics.get(shortCode);
      stats.impressions++;
      stats.clicks++;
      stats.devices[deviceType] = (stats.devices[deviceType] || 0) + 1;
      stats.browsers[browser] = (stats.browsers[browser] || 0) + 1;
      stats.referrers[referrerSource] = (stats.referrers[referrerSource] || 0) + 1;
      stats.countries[locationData.country] = (stats.countries[locationData.country] || 0) + 1;
      stats.locations[locationKey] = (stats.locations[locationKey] || 0) + 1;
      
      stats.clickHistory.push(clickData);
      
      if (utmSource) {
        stats.shares++;
      }
      
      if (variantLabel) {
        if (!stats.variantClicks) stats.variantClicks = {};
        stats.variantClicks[variantLabel] = (stats.variantClicks[variantLabel] || 0) + 1;
      }
      
      analytics.set(shortCode, stats);
      
      io.emit(`analytics:${shortCode}`, {
        type: 'click',
        data: stats
      });

      // Always emit the generic analyticsUpdate

      io.emit('analyticsUpdate', {
        shortCode,
        click: clickData
      });

      if (variantLabel) {
        io.emit('splitTestUpdate', {
          shortCode,
          variantLabel,
          click: clickData
        });
      }
    }
  } catch (error) {
    console.error('Error tracking click:', error);
  }
}

// Redirect username/slug format links (e.g., /xthxr/my-link)

app.get('/:username/:slug', async (req, res) => {
  const { username, slug } = req.params;
  const shortCode = `${username}/${slug}`;
  const { link } = await resolveLinkForRedirect(shortCode);
  
  if (!link) {
    return res.status(404).send('Link not found');
  }

  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return res.status(410).send('Gone: This link has expired');
  }

  let redirectUrl = link.originalUrl;
  let variantLabel = null;

  if (link.splitTest && Array.isArray(link.variants) && link.variants.length > 0) {
    const selectedVariant = splitTestService.selectVariantByWeight(link.variants);
    redirectUrl = selectedVariant.url;
    variantLabel = selectedVariant.label;
  }

  // Track click analytics in background/non-blocking

  trackClickAndEmit(shortCode, req, variantLabel).catch(err => {
    console.error('Error tracking redirect click:', err);
  });

  res.redirect(redirectUrl);
});

// Redirect short link and track click (also handles bio links)

app.get('/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  
  // First check if it's a bio link

  const bioLinkStatus = await resolveBioLinkStatus(shortCode);
  if (bioLinkStatus.exists) {
    // It's a bio link, serve bio.html

    return res.sendFile(path.join(__dirname, 'public', 'bio.html'));
  }
  
  // Not a bio link, try as regular short link

  const { link } = await resolveLinkForRedirect(shortCode);
  
  if (!link) {
    return res.status(404).send('Link not found');
  }

  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return res.status(410).send('Gone: This link has expired');
  }

  let redirectUrl = link.originalUrl;
  let variantLabel = null;

  if (link.splitTest && Array.isArray(link.variants) && link.variants.length > 0) {
    const selectedVariant = splitTestService.selectVariantByWeight(link.variants);
    redirectUrl = selectedVariant.url;
    variantLabel = selectedVariant.label;
  }

  // Track click analytics in background/non-blocking

  trackClickAndEmit(shortCode, req, variantLabel).catch(err => {
    console.error('Error tracking redirect click:', err);
  });

  res.redirect(redirectUrl);
});

// Admin endpoint: Sync all links to Redis

app.post('/api/admin/sync-redis', verifyToken, async (req, res) => {
  try {
    // Check if user is admin (you can add admin check logic here)

    const result = await redisUtils.syncAllLinksToRedis(db);
    
    res.json({
      success: result.success,
      message: `Synced ${result.count} links to Redis`,
      errors: result.errors || 0
    });
  } catch (error) {
    console.error('Error syncing to Redis:', error);
    res.status(500).json({ 
      error: 'Failed to sync to Redis', 
      details: error.message 
    });
  }
});

// Expired link page

app.get('/expired', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'expired.html'));
});

if (!isServerless) {

  // Socket.IO connection

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('subscribe', (shortCode) => {
      console.log(`Client ${socket.id} subscribed to ${shortCode}`);
      socket.join(`analytics:${shortCode}`);
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // 24-hour pre-expiry notification check (runs every hour)

  setInterval(async () => {
    if (!db) return;
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const snapshot = await db.collection(COLLECTIONS.LINKS)
        .where('isActive', '==', true)
        .where('notifiedExpiry', '==', false)
        .get();
      for (const doc of snapshot.docs) {
        const link = doc.data();
        if (link.expiresAt && link.expiresAt.toDate) {
          const expiry = link.expiresAt.toDate();
          if (expiry <= in24h && expiry > now) {
            console.log(`⏰ Link expiring soon: ${link.shortCode} (${link.userEmail})`);
            await doc.ref.update({ notifiedExpiry: true });

            // TODO: plug in Nodemailer here to email link.userEmail
            
          }
        }
      }
    } catch (err) {
      console.error('Expiry notification check error:', err);
    }
  }, 60 * 60 * 1000);

  // Start server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`🚀 Link360 server running on http://localhost:${PORT}`);
  });
}

module.exports = app;