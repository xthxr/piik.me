const crypto = require('crypto');
const admin = require('firebase-admin');

const BOT_PATTERNS = /bot|crawler|spider|scraper|curl|wget|python-requests/i;

/**
 * Heuristic to detect common search engine spiders, bots, and curl clients.
 * @param {object} req - Express request object
 * @returns {boolean} True if the request is likely from a bot/crawler
 */
function isLikelyBot(req) {
  const ua = req.headers['user-agent'] || '';
  return BOT_PATTERNS.test(ua) || !ua;
}

// In-memory set for local/fallback deduplication
const memoryDedup = new Map();

// Clean up memory cache every hour to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of memoryDedup.entries()) {
    if (now - timestamp > 25 * 60 * 60 * 1000) { // 25 hours
      memoryDedup.delete(key);
    }
  }
}, 60 * 60 * 1000);

/**
 * Checks if a redirect click is unique within a 24-hour window.
 * Tracks a hash of IP + User-Agent + shortCode + date.
 * @param {object} db - Firestore database instance
 * @param {string} shortCode - The short link code
 * @param {object} req - Express request object
 * @returns {Promise<boolean>} True if the click is unique (not tracked in last 24h)
 */
async function isUniqueClick(db, shortCode, req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
             req.headers['x-real-ip'] || 
             req.connection?.remoteAddress || 
             req.socket?.remoteAddress || 
             'unknown';
             
  const userAgent = req.headers['user-agent'] || '';
  const dateStr = new Date().toISOString().split('T')[0];
  
  const clientHash = crypto
    .createHash('sha256')
    .update(`${ip}:${userAgent}:${shortCode}:${dateStr}`)
    .digest('hex')
    .slice(0, 16);

  if (!db) {
    // In-memory fallback
    if (memoryDedup.has(clientHash)) {
      return false; // Duplicate
    }
    memoryDedup.set(clientHash, Date.now());
    return true;
  }

  try {
    const dedupRef = db.collection('click_dedup').doc(clientHash);
    const doc = await dedupRef.get();

    if (doc.exists) return false; // Duplicate

    await dedupRef.set({ 
      shortCode, 
      createdAt: admin.firestore.FieldValue.serverTimestamp() 
    });
    return true;
  } catch (error) {
    console.error('Error in Firestore deduplication, falling back to memory:', error);
    if (memoryDedup.has(clientHash)) {
      return false;
    }
    memoryDedup.set(clientHash, Date.now());
    return true;
  }
}

module.exports = {
  isUniqueClick,
  isLikelyBot
};
