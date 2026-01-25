const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { nanoid } = require('nanoid');
const admin = require('firebase-admin');
const redisUtils = require('./src/utils/redis.utils');
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
  const { url, utmParams, customShortCode, username } = req.body;
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

  const baseUrl = getBaseUrl(req);
  const shortUrl = `${baseUrl}/${shortCode}`;
  
  // Store link data
  const linkData = {
    originalUrl: finalUrl,
    shortCode,
    shortUrl,
    userId,
    userEmail: req.user.email || '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    utmParams: parseUTMParams(finalUrl) || utmParams || {},
    isCustom: !!customShortCode,
    isActive: true
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
    
    // Fallback to in-memory storage
    links.set(shortCode, linkData);
    analytics.set(shortCode, analyticsData);
    
    res.json({
      success: true,
      shortUrl,
      shortCode,
      originalUrl: finalUrl,
      isCustom: !!customShortCode
    });
  }
});

// Get analytics for a short link
app.get('/api/analytics/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  
  try {
    // Try Firestore first
    const firestoreId = toFirestoreId(shortCode);
    const linkDoc = await db.collection(COLLECTIONS.LINKS).doc(firestoreId).get();
    const analyticsDoc = await db.collection(COLLECTIONS.ANALYTICS).doc(firestoreId).get();
    
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

// Get all links for a user (requires authentication)
app.get('/api/user/links', verifyToken, async (req, res) => {
  const userId = req.user.uid;
  
  console.log(`🔍 Fetching links for user: ${userId}`);
  
  try {
    // First, let's see ALL documents in the collection for debugging
    const allDocsSnapshot = await db.collection(COLLECTIONS.LINKS).get();
    console.log(`Total documents in LINKS collection: ${allDocsSnapshot.docs.length}`);
    allDocsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  Doc ${doc.id}: userId=${data.userId}, shortCode=${data.shortCode}`);
    });
    
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
			
      console.log(`Processing link: ${doc.id}`, { shortCode: linkData.shortCode, isActive: linkData.isActive });
      
      // Use the Firestore document ID (which is already safe) instead of shortCode field
      const analyticsDoc = await db.collection(COLLECTIONS.ANALYTICS).doc(doc.id).get();
      const analyticsData = analyticsDoc.exists ? analyticsDoc.data() : {
        impressions: 0,
        clicks: 0,
        shares: 0
      };
      
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

// Delete a link (requires authentication and ownership)
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
    
    res.json({ success: true, message: 'Link deleted successfully' });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: 'Failed to delete link', details: error.message });
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

// Track share (deprecated - now tracked automatically via UTM parameters)
// Keeping endpoint for backward compatibility but shares are counted on click with UTM
app.post('/api/track/share/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  // Shares are now tracked automatically when links with utm_source are clicked
  // No need to manually increment here
  res.json({ success: true, message: 'Shares tracked via UTM parameters' });
});

// Create GitHub Issue for Bug Report
app.post('/api/bug-report', async (req, res) => {
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
// This ensures all app routes (/home, /analytics, /profile) serve the index.html
// Must be BEFORE the /:shortCode route to avoid conflicts
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

app.get(['/home', '/analytics', '/profile', '/qr-generator', '/bio-link', '/dashboard'], (req, res) => {
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
      await analyticsRef.update({
        impressions: admin.firestore.FieldValue.increment(1)
      });
    }
  } catch (error) {
    console.error('Error tracking impression:', error);
  }
  
  res.status(200).end();
});

// Redirect username/slug format links (e.g., /xthxr/my-link)
app.get('/:username/:slug', async (req, res) => {
  const { username, slug } = req.params;
  const shortCode = `${username}/${slug}`;
  
  let link = null;
  
  try {
    // Convert to Firestore-safe ID (username_slug) for lookup
    const firestoreId = toFirestoreId(shortCode);
    const linkDoc = await db.collection(COLLECTIONS.LINKS).doc(firestoreId).get();
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
  const httpReferrer = req.headers['referer'] || req.headers['referrer'] || '';
  
  // Enhanced referrer detection
  let referrerSource = 'Direct';
  
  // Check URL query parameters first (most reliable - from share menu)
  const utmSource = req.query.utm_source;
  
  if (utmSource) {
    // Use UTM source from share menu
    referrerSource = utmSource.charAt(0).toUpperCase() + utmSource.slice(1);
  } else if (httpReferrer) {
    // Parse HTTP referrer header
    try {
      const refUrl = new URL(httpReferrer);
      const hostname = refUrl.hostname.toLowerCase().replace('www.', '');
      
      // Map common domains to friendly names
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
    // Detect in-app browsers based on User-Agent
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
  
  // Device detection
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
  const deviceType = isMobile ? 'Mobile' : 'Desktop';
  
  // Enhanced browser detection
  let browser = 'Other';
  const ua = userAgent.toLowerCase();
  
  // Check for in-app browsers first
  if (ua.includes('instagram')) browser = 'Instagram App';
  else if (ua.includes('whatsapp')) browser = 'WhatsApp';
  else if (ua.includes('fb_iab') || ua.includes('fbav')) browser = 'Facebook App';
  else if (ua.includes('twitter')) browser = 'Twitter App';
  else if (ua.includes('linkedin')) browser = 'LinkedIn App';
  // Regular browsers
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';
  
  // Get client IP address
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress || 
                   'unknown';
  
  // Fetch geolocation data
  let locationData = {
    country: 'Unknown',
    city: 'Unknown',
    region: 'Unknown'
  };
  
  try {
    // Use ip-api.com for free geolocation (no API key required)
    const geoResponse = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,country,regionName,city`);
    if (geoResponse.ok) {
      const geoData = await geoResponse.json();
      if (geoData.status === 'success') {
        locationData = {
          country: geoData.country || 'Unknown',
          city: geoData.city || 'Unknown',
          region: geoData.regionName || 'Unknown'
        };
      }
    }
  } catch (geoError) {
    console.log('Geolocation lookup failed:', geoError.message);
  }
  
  const clickData = {
    timestamp: new Date().toISOString(),
    device: deviceType,
    browser,
    referrer: referrerSource,
    location: locationData
  };

  // Update analytics
  try {
    const firestoreId = toFirestoreId(shortCode);
    const analyticsRef = db.collection(COLLECTIONS.ANALYTICS).doc(firestoreId);
    const analyticsDoc = await analyticsRef.get();

    if (analyticsDoc.exists) {
      // Store each click as a separate document in clicks sub-collection
      // This avoids the 1MB Firestore document limit and allows infinite scaling
      const clickRef = analyticsRef.collection('clicks').doc();
      await clickRef.set(clickData);

      // Update aggregate counters
      await analyticsRef.update({
        clicks: admin.firestore.FieldValue.increment(1),
        [`devices.${deviceType}`]: admin.firestore.FieldValue.increment(1),
        [`browsers.${browser}`]: admin.firestore.FieldValue.increment(1),
        [`countries.${locationData.country}`]: admin.firestore.FieldValue.increment(1),
        [`locations.${locationData.city}`]: admin.firestore.FieldValue.increment(1),
        [`referrers.${referrerSource}`]: admin.firestore.FieldValue.increment(1)
      });
    }
  } catch (error) {
    console.error('Error updating analytics:', error);
    
    // Fallback to in-memory analytics
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
        referrers: {}
      });
    }
    
    const analyticsData = analytics.get(shortCode);
    analyticsData.clicks++;
    analyticsData.clickHistory.push(clickData);
    analyticsData.devices[deviceType] = (analyticsData.devices[deviceType] || 0) + 1;
    analyticsData.browsers[browser] = (analyticsData.browsers[browser] || 0) + 1;
    analyticsData.countries[locationData.country] = (analyticsData.countries[locationData.country] || 0) + 1;
    analyticsData.locations[locationData.city] = (analyticsData.locations[locationData.city] || 0) + 1;
    analyticsData.referrers[referrerSource] = (analyticsData.referrers[referrerSource] || 0) + 1;
  }

  // Emit real-time analytics update via Socket.io
  io.emit('analyticsUpdate', {
    shortCode,
    click: clickData
  });

  // Redirect to original URL
  res.redirect(link.originalUrl);
});

// Redirect short link and track click (also handles bio links)
app.get('/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  
  // First check if it's a bio link
  try {
    const bioLinkDoc = await db.collection('bioLinks').where('slug', '==', shortCode).limit(1).get();
    if (!bioLinkDoc.empty) {
      // It's a bio link, serve bio.html
      return res.sendFile(path.join(__dirname, 'public', 'bio.html'));
    }
  } catch (error) {
    console.error('Error checking bio link:', error);
  }
  
  // Not a bio link, try as regular short link
  let link = null;
  
  try {
    // Convert to Firestore-safe ID for lookup
    const firestoreId = toFirestoreId(shortCode);
    const linkDoc = await db.collection(COLLECTIONS.LINKS).doc(firestoreId).get();
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
  const httpReferrer = req.headers['referer'] || req.headers['referrer'] || '';
  
  // Enhanced referrer detection
  let referrerSource = 'Direct';
  
  // Check URL query parameters first (most reliable - from share menu)
  const utmSource = req.query.utm_source;
  
  if (utmSource) {
    // Use UTM source from share menu
    referrerSource = utmSource.charAt(0).toUpperCase() + utmSource.slice(1);
  } else if (httpReferrer) {
    // Parse HTTP referrer header
    try {
      const refUrl = new URL(httpReferrer);
      const hostname = refUrl.hostname.toLowerCase().replace('www.', '');
      
      // Map common domains to friendly names
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
    // Detect in-app browsers based on User-Agent
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
  
  // Device detection
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
  const deviceType = isMobile ? 'Mobile' : 'Desktop';
  
  // Enhanced browser detection
  let browser = 'Other';
  const ua = userAgent.toLowerCase();
  
  // Check for in-app browsers first
  if (ua.includes('instagram')) browser = 'Instagram App';
  else if (ua.includes('whatsapp')) browser = 'WhatsApp';
  else if (ua.includes('fb_iab') || ua.includes('fbav')) browser = 'Facebook App';
  else if (ua.includes('twitter')) browser = 'Twitter App';
  else if (ua.includes('linkedin')) browser = 'LinkedIn App';
  // Regular browsers
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';
  
  // Get client IP address
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress || 
                   'unknown';
  
  // Fetch geolocation data
  let locationData = {
    country: 'Unknown',
    city: 'Unknown',
    region: 'Unknown'
  };
  
  try {
    // Use ip-api.com for free geolocation (no API key required)
    const geoResponse = await fetch(`http://ip-api.com/json/${clientIP}?fields=status,country,regionName,city`);
    if (geoResponse.ok) {
      const geoData = await geoResponse.json();
      if (geoData.status === 'success') {
        locationData = {
          country: geoData.country || 'Unknown',
          city: geoData.city || 'Unknown',
          region: geoData.regionName || 'Unknown'
        };
      }
    }
  } catch (geoError) {
    console.log('Geolocation lookup failed:', geoError.message);
  }
  
  const clickData = {
    timestamp: new Date().toISOString(),
    device: deviceType,
    browser,
    referrer: referrerSource,
    userAgent: userAgent.substring(0, 200), // Store truncated UA for debugging
    isShared: utmSource ? true : false, // Track if this click came from a share
    location: locationData,
    ipAddress: clientIP // Store IP address for detailed analytics
  };

  try {
    // Update Firestore
    const firestoreId = toFirestoreId(shortCode);
    const analyticsRef = db.collection(COLLECTIONS.ANALYTICS).doc(firestoreId);
    const doc = await analyticsRef.get();
    
    if (doc.exists) {
      const currentData = doc.data();
      
      // Increment impressions AND clicks
      // Impressions represent total views (including clicks)
      // This way: impressions >= clicks always
      // Create location key (City, Region)
      const locationKey = `${locationData.city}, ${locationData.region}`;
      
      // Store each click as a separate document in clicks sub-collection
      // This avoids the 1MB Firestore document limit and allows infinite scaling
      const clickRef = analyticsRef.collection('clicks').doc();
      await clickRef.set(clickData);

      const updateData = {
        impressions: admin.firestore.FieldValue.increment(1),
        clicks: admin.firestore.FieldValue.increment(1),
        [`devices.${deviceType}`]: admin.firestore.FieldValue.increment(1),
        [`browsers.${browser}`]: admin.firestore.FieldValue.increment(1),
        [`referrers.${referrerSource}`]: admin.firestore.FieldValue.increment(1),
        [`countries.${locationData.country}`]: admin.firestore.FieldValue.increment(1),
        [`locations.${locationKey}`]: admin.firestore.FieldValue.increment(1)
      };
      
      // If UTM source exists, count it as a share
      if (utmSource) {
        updateData.shares = admin.firestore.FieldValue.increment(1);
      }
      
      await analyticsRef.update(updateData);
      
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
      stats.impressions++;
      stats.clicks++;
      stats.devices[deviceType] = (stats.devices[deviceType] || 0) + 1;
      stats.browsers[browser] = (stats.browsers[browser] || 0) + 1;
      stats.referrers[referrerSource] = (stats.referrers[referrerSource] || 0) + 1;
      
      // Track location
      const locationKey = `${locationData.city}, ${locationData.region}`;
      if (!stats.countries) stats.countries = {};
      if (!stats.locations) stats.locations = {};
      stats.countries[locationData.country] = (stats.countries[locationData.country] || 0) + 1;
      stats.locations[locationKey] = (stats.locations[locationKey] || 0) + 1;
      
      stats.clickHistory.push(clickData);
      
      // Count as share if UTM source exists
      if (utmSource) {
        stats.shares++;
      }
      
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
  console.log(`🚀 Link360 server running on http://localhost:${PORT}`);
});
