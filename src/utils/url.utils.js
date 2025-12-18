const { nanoid } = require('nanoid');

/**
 * Generate a random short code
 * @param {number} length - Length of the short code (default: 7)
 * @returns {string} Random short code
 */
function generateShortCode(length = 7) {
  return nanoid(length);
}

/**
 * Parse UTM parameters from URL
 * @param {string} url - URL to parse
 * @returns {Object|null} Object with UTM parameters or null if invalid
 */
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

/**
 * Add UTM parameters to URL
 * @param {string} url - Base URL
 * @param {Object} utmParams - UTM parameters object
 * @returns {string|null} URL with UTM parameters or null if invalid
 */
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

/**
 * Get base URL from request
 * @param {Object} req - Express request object
 * @returns {string} Base URL
 */
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

/**
 * Convert shortCode to Firestore-safe document ID
 * Firestore document IDs cannot contain '/' so we replace with '_'
 * @param {string} shortCode - Short code to convert
 * @returns {string} Firestore-safe document ID
 */
function toFirestoreId(shortCode) {
  return shortCode.replace(/\//g, '_');
}

/**
 * Convert Firestore ID back to shortCode
 * @param {string} firestoreId - Firestore document ID
 * @returns {string} Original short code format
 */
function fromFirestoreId(firestoreId) {
  // Keep as-is, shortCode field in the document has the original format
  return firestoreId;
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Validate custom short code format
 * @param {string} code - Short code to validate
 * @returns {Object} { valid: boolean, error: string|null }
 */
function validateCustomShortCode(code) {
  const trimmedCode = code.trim();
  
  if (trimmedCode.length < 3) {
    return { valid: false, error: 'Custom short code must be at least 3 characters' };
  }
  
  if (trimmedCode.length > 50) {
    return { valid: false, error: 'Custom short code must be less than 50 characters' };
  }
  
  if (!/^[a-zA-Z0-9-_]+$/.test(trimmedCode)) {
    return { valid: false, error: 'Custom short code can only contain letters, numbers, hyphens, and underscores' };
  }
  
  return { valid: true, error: null };
}

module.exports = {
  generateShortCode,
  parseUTMParams,
  addUTMParams,
  getBaseUrl,
  toFirestoreId,
  fromFirestoreId,
  isValidUrl,
  validateCustomShortCode
};
