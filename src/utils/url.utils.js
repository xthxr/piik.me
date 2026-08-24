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
 * Validate a destination URL for security (SSRF/XSS/Phishing)
 * @param {string} url - URL to validate
 * @returns {Object} { valid: boolean, error: string|null }
 */
function validateUrl(url) {
  if (!url) {
    return { valid: false, error: 'URL is required' };
  }

  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.toLowerCase();
    
    // Check protocol allowlist
    if (protocol !== 'http:' && protocol !== 'https:') {
      return { valid: false, error: 'Only http and https URLs are allowed' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost and local hostnames (SSRF prevention)
    if (hostname === 'localhost' || hostname === 'localhost.localdomain' || hostname.endsWith('.local')) {
      return { valid: false, error: 'Access to local hostnames is forbidden' };
    }

    // IPv4 checks
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipv4Match = hostname.match(ipv4Regex);
    if (ipv4Match) {
      const parts = ipv4Match.slice(1).map(Number);
      if (parts.some(part => part > 255)) {
        return { valid: false, error: 'Invalid IP address' };
      }
      
      const first = parts[0];
      const second = parts[1];

      // Loopback: 127.0.0.0/8
      if (first === 127) {
        return { valid: false, error: 'Access to loopback IP addresses is forbidden' };
      }
      // Private range RFC 1918: 10.0.0.0/8
      if (first === 10) {
        return { valid: false, error: 'Access to private IP addresses is forbidden' };
      }
      // Private range RFC 1918: 172.16.0.0/12
      if (first === 172 && (second >= 16 && second <= 31)) {
        return { valid: false, error: 'Access to private IP addresses is forbidden' };
      }
      // Private range RFC 1918: 192.168.0.0/16
      if (first === 192 && second === 168) {
        return { valid: false, error: 'Access to private IP addresses is forbidden' };
      }
      // Link-local: 169.254.0.0/16
      if (first === 169 && second === 254) {
        return { valid: false, error: 'Access to link-local IP addresses is forbidden' };
      }
      // Broadcast / anycast: 0.0.0.0, 255.255.255.255
      if (first === 0 || (first === 255 && parts[1] === 255 && parts[2] === 255 && parts[3] === 255)) {
        return { valid: false, error: 'Access to broadcast/anycast IP addresses is forbidden' };
      }
    }

    // IPv6 checks
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      const ipv6 = hostname.slice(1, -1);
      // IPv6 Loopback: ::1
      if (ipv6 === '1' || ipv6 === '0:0:0:0:0:0:0:1' || ipv6 === '::1') {
        return { valid: false, error: 'Access to loopback IP addresses is forbidden' };
      }
      // Unique Local Address: fc00::/7
      // Link-Local Address: fe80::/10
      const cleanIpv6 = ipv6.replace(/^0+/, '').toLowerCase();
      if (cleanIpv6.startsWith('fc') || cleanIpv6.startsWith('fd') || cleanIpv6.startsWith('fe8') || cleanIpv6.startsWith('fe9') || cleanIpv6.startsWith('fea') || cleanIpv6.startsWith('feb')) {
        return { valid: false, error: 'Access to private/link-local IP addresses is forbidden' };
      }
    }

    return { valid: true, error: null };
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function isValidUrl(url) {
  return validateUrl(url).valid;
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
  validateUrl,
  validateCustomShortCode
};
