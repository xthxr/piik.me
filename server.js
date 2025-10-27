const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { nanoid } = require('nanoid');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.log('⚠️  Firebase Admin not configured. Using in-memory storage.');
  console.log('   See FIREBASE_SETUP.md for setup instructions.');
}

const db = admin.firestore();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Firestore Collections
const COLLECTIONS = {
  LINKS: 'links',
  ANALYTICS: 'analytics',
  USERS: 'users'
};

// Middleware to verify Firebase token
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

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
  const { url, utmParams } = req.body;
  const userId = req.user.uid;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Validate URL
  try {
    new URL(url);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // Add UTM parameters if provided
  let finalUrl = url;
  if (utmParams) {
    const urlWithUTM = addUTMParams(url, utmParams);
    if (urlWithUTM) {
      finalUrl = urlWithUTM;
    }
  }

  const shortCode = generateShortCode();
  const baseUrl = getBaseUrl(req);
  const shortUrl = `${baseUrl}/${shortCode}`;
  
  // Store link data
  const linkData = {
    originalUrl: finalUrl,
    shortCode,
    shortUrl,
    userId,
    userEmail: req.user.email || '',
    createdAt: new Date().toISOString(),
    utmParams: parseUTMParams(finalUrl) || utmParams || {}
  };

  const analyticsData = {
    impressions: 0,
    clicks: 0,
    shares: 0,
    clickHistory: [],
    devices: {},
    browsers: {},
    countries: {},
    referrers: {}
  };

  try {
    // Save to Firestore
    await db.collection(COLLECTIONS.LINKS).doc(shortCode).set(linkData);
    await db.collection(COLLECTIONS.ANALYTICS).doc(shortCode).set(analyticsData);
    
    res.json({
      success: true,
      shortUrl,
      shortCode,
      originalUrl: finalUrl
    });
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    
    // Fallback to in-memory storage
    links.set(shortCode, linkData);
    analytics.set(shortCode, analyticsData);
    
    res.json({
      success: true,
      shortUrl,
      shortCode,
      originalUrl: finalUrl
    });
  }
});

// Get analytics for a short link
app.get('/api/analytics/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  
  try {
    // Try Firestore first
    const linkDoc = await db.collection(COLLECTIONS.LINKS).doc(shortCode).get();
    const analyticsDoc = await db.collection(COLLECTIONS.ANALYTICS).doc(shortCode).get();
    
    if (linkDoc.exists && analyticsDoc.exists) {
      return res.json({
        link: linkDoc.data(),
        analytics: analyticsDoc.data()
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

  res.json({
    link,
    analytics: stats
  });
});

// Get all links for a user (requires authentication)
app.get('/api/user/links', verifyToken, async (req, res) => {
  const userId = req.user.uid;
  
  try {
    // Try with orderBy first
    let linksSnapshot;
    try {
      linksSnapshot = await db.collection(COLLECTIONS.LINKS)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
    } catch (orderError) {
      // If orderBy fails (missing index), try without it
      console.log('OrderBy failed, trying without ordering:', orderError.message);
      linksSnapshot = await db.collection(COLLECTIONS.LINKS)
        .where('userId', '==', userId)
        .get();
    }
    
    const userLinks = [];
    
    for (const doc of linksSnapshot.docs) {
      const linkData = doc.data();
      const analyticsDoc = await db.collection(COLLECTIONS.ANALYTICS).doc(linkData.shortCode).get();
      
      userLinks.push({
        ...linkData,
        analytics: analyticsDoc.exists ? analyticsDoc.data() : {
          impressions: 0,
          clicks: 0,
          shares: 0
        }
      });
    }
    
    // Sort by createdAt in JavaScript if we couldn't use orderBy
    userLinks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ links: userLinks });
  } catch (error) {
    console.error('Error fetching user links:', error);
    res.status(500).json({ error: 'Failed to fetch links', details: error.message });
  }
});

// Track impression (when analytics page is viewed)
app.post('/api/track/impression/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  
  try {
    const analyticsRef = db.collection(COLLECTIONS.ANALYTICS).doc(shortCode);
    const doc = await analyticsRef.get();
    
    if (doc.exists) {
      await analyticsRef.update({
        impressions: admin.firestore.FieldValue.increment(1)
      });
      
      const updated = await analyticsRef.get();
      const stats = updated.data();
      
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

// Track share
app.post('/api/track/share/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  
  try {
    const analyticsRef = db.collection(COLLECTIONS.ANALYTICS).doc(shortCode);
    const doc = await analyticsRef.get();
    
    if (doc.exists) {
      await analyticsRef.update({
        shares: admin.firestore.FieldValue.increment(1)
      });
      
      const updated = await analyticsRef.get();
      const stats = updated.data();
      
      io.emit(`analytics:${shortCode}`, {
        type: 'share',
        data: stats
      });
      
      return res.json({ success: true });
    }
  } catch (error) {
    console.error('Error tracking share:', error);
  }
  
  // Fallback to in-memory
  const stats = analytics.get(shortCode);
  if (stats) {
    stats.shares++;
    analytics.set(shortCode, stats);
    
    io.emit(`analytics:${shortCode}`, {
      type: 'share',
      data: stats
    });
    
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Link not found' });
  }
});

// Redirect short link and track click
app.get('/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  
  let link = null;
  
  try {
    // Try Firestore first
    const linkDoc = await db.collection(COLLECTIONS.LINKS).doc(shortCode).get();
    if (linkDoc.exists) {
      link = linkDoc.data();
    }
  } catch (error) {
    console.error('Error reading link from Firestore:', error);
  }
  
  // Fallback to in-memory
  if (!link) {
    link = links.get(shortCode);
  }
  
  if (!link) {
    return res.status(404).send('Link not found');
  }

  // Track click analytics
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const referrer = req.headers['referer'] || 'Direct';
  
  // Simple device detection
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
  const deviceType = isMobile ? 'Mobile' : 'Desktop';
  
  // Simple browser detection
  let browser = 'Other';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  
  const clickData = {
    timestamp: new Date().toISOString(),
    device: deviceType,
    browser,
    referrer
  };

  try {
    // Update Firestore
    const analyticsRef = db.collection(COLLECTIONS.ANALYTICS).doc(shortCode);
    const doc = await analyticsRef.get();
    
    if (doc.exists) {
      const currentData = doc.data();
      
      await analyticsRef.update({
        clicks: admin.firestore.FieldValue.increment(1),
        [`devices.${deviceType}`]: admin.firestore.FieldValue.increment(1),
        [`browsers.${browser}`]: admin.firestore.FieldValue.increment(1),
        [`referrers.${referrer}`]: admin.firestore.FieldValue.increment(1),
        clickHistory: admin.firestore.FieldValue.arrayUnion(clickData)
      });
      
      const updated = await analyticsRef.get();
      const stats = updated.data();
      
      // Emit real-time update
      io.emit(`analytics:${shortCode}`, {
        type: 'click',
        data: stats
      });
    }
  } catch (error) {
    console.error('Error tracking click:', error);
    
    // Fallback to in-memory
    const stats = analytics.get(shortCode);
    if (stats) {
      stats.clicks++;
      stats.devices[deviceType] = (stats.devices[deviceType] || 0) + 1;
      stats.browsers[browser] = (stats.browsers[browser] || 0) + 1;
      stats.referrers[referrer] = (stats.referrers[referrer] || 0) + 1;
      stats.clickHistory.push(clickData);
      
      analytics.set(shortCode, stats);
      
      io.emit(`analytics:${shortCode}`, {
        type: 'click',
        data: stats
      });
    }
  }

  // Redirect to original URL
  res.redirect(link.originalUrl);
});

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

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Zaplink server running on http://localhost:${PORT}`);
});
