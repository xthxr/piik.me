const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { nanoid } = require('nanoid');
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin (optional)
let db = null;
try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
  db = admin.firestore();
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.log('⚠️  Firebase Admin not configured. Using in-memory storage.');
  console.log('   See FIREBASE_SETUP.md for setup instructions.');
}

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
  const { url, utmParams, customShortCode } = req.body;
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
    
    // Check if already exists in Firestore
    try {
      const existingDoc = await db.collection(COLLECTIONS.LINKS).doc(trimmedCode).get();
      if (existingDoc.exists) {
        return res.status(409).json({ error: 'This custom short code is already taken' });
      }
    } catch (error) {
      console.error('Error checking custom short code:', error);
    }
    
    // Check in-memory storage as fallback
    if (links.has(trimmedCode)) {
      return res.status(409).json({ error: 'This custom short code is already taken' });
    }
    
    shortCode = trimmedCode;
  } else {
    // Generate random short code
    shortCode = generateShortCode();
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
    createdAt: new Date().toISOString(),
    utmParams: parseUTMParams(finalUrl) || utmParams || {},
    isCustom: !!customShortCode
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

// Delete a link (requires authentication and ownership)
app.delete('/api/links/:shortCode', verifyToken, async (req, res) => {
  const { shortCode } = req.params;
  const userId = req.user.uid;
  
  try {
    // Check if link exists and belongs to user
    const linkRef = db.collection(COLLECTIONS.LINKS).doc(shortCode);
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
    const analyticsRef = db.collection(COLLECTIONS.ANALYTICS).doc(shortCode);
    await analyticsRef.delete();
    
    res.json({ success: true, message: 'Link deleted successfully' });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: 'Failed to delete link', details: error.message });
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

// Catch-all route for client-side routing
// This ensures all app routes (/home, /analytics, /profile) serve the index.html
// Must be BEFORE the /:shortCode route to avoid conflicts
app.get(['/', '/home', '/analytics', '/profile'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Track impression without redirect (for link previews - HEAD request)
app.head('/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  
  try {
    const analyticsRef = db.collection(COLLECTIONS.ANALYTICS).doc(shortCode);
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
  
  const clickData = {
    timestamp: new Date().toISOString(),
    device: deviceType,
    browser,
    referrer: referrerSource,
    userAgent: userAgent.substring(0, 200), // Store truncated UA for debugging
    isShared: utmSource ? true : false // Track if this click came from a share
  };

  try {
    // Update Firestore
    const analyticsRef = db.collection(COLLECTIONS.ANALYTICS).doc(shortCode);
    const doc = await analyticsRef.get();
    
    if (doc.exists) {
      const currentData = doc.data();
      
      // Increment impressions AND clicks
      // Impressions represent total views (including clicks)
      // This way: impressions >= clicks always
      const updateData = {
        impressions: admin.firestore.FieldValue.increment(1),
        clicks: admin.firestore.FieldValue.increment(1),
        [`devices.${deviceType}`]: admin.firestore.FieldValue.increment(1),
        [`browsers.${browser}`]: admin.firestore.FieldValue.increment(1),
        [`referrers.${referrerSource}`]: admin.firestore.FieldValue.increment(1),
        clickHistory: admin.firestore.FieldValue.arrayUnion(clickData)
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
