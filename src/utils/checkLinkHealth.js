const axios = require('axios');
const dns = require('dns').promises;

/**
 * Checks if an IPv4 or IPv6 address is private, loopback, or local
 * @param {string} ip - IP address string
 * @returns {boolean} True if the IP is private/local/loopback
 */
function isPrivateIp(ip) {
  // IPv4 Loopback (127.0.0.0/8)
  if (/^127\./.test(ip)) return true;

  // IPv4 Private ranges:
  // 10.0.0.0/8
  if (/^10\./.test(ip)) return true;
  // 172.16.0.0/12
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  // 192.168.0.0/16
  if (/^192\.168\./.test(ip)) return true;
  // Link-local (169.254.0.0/16)
  if (/^169\.254\./.test(ip)) return true;
  // Broadcast/Anycast: 0.0.0.0 or 255.255.255.255
  if (ip === '0.0.0.0' || ip === '255.255.255.255') return true;

  // IPv6 Loopback: ::1
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;

  // IPv6 Unique Local Address: fc00::/7
  // IPv6 Link-Local Address: fe80::/10
  const cleanIpv6 = ip.replace(/^0+/, '').toLowerCase();
  if (cleanIpv6.startsWith('fc') || cleanIpv6.startsWith('fd') || cleanIpv6.startsWith('fe8') || cleanIpv6.startsWith('fe9') || cleanIpv6.startsWith('fea') || cleanIpv6.startsWith('feb')) {
    return true;
  }

  return false;
}

/**
 * Validates if the destination URL hostname/resolved IP is public and safe to access
 * @param {string} url - URL string to validate
 * @returns {Promise<boolean>} True if safe
 */
async function isSafeUrl(url) {
  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.toLowerCase();
    
    if (protocol !== 'http:' && protocol !== 'https:') {
      return false;
    }

    let hostname = parsed.hostname.toLowerCase();
    
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1);
    }

    if (isPrivateIp(hostname)) {
      return false;
    }

    if (hostname === 'localhost' || hostname === 'localhost.localdomain' || hostname.endsWith('.local')) {
      return false;
    }

    try {
      const result = await dns.lookup(hostname);
      if (result && isPrivateIp(result.address)) {
        return false;
      }
    } catch {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Performs axios request following redirects manually while checking URL safety
 * @param {string} url - Target URL
 * @param {string} method - Request method (head/get)
 * @returns {Promise<Object>} Response object
 */
async function requestWithSafeRedirects(url, method = 'head') {
  let currentUrl = url;
  let redirectsCount = 0;
  const maxRedirects = 3;

  while (redirectsCount <= maxRedirects) {
    if (!(await isSafeUrl(currentUrl))) {
      throw new Error('Access to private/unallowed URL is forbidden');
    }

    const response = await axios({
      method,
      url: currentUrl,
      timeout: 5000,
      maxRedirects: 0,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      const redirectUrl = new URL(response.headers.location, currentUrl).toString();
      currentUrl = redirectUrl;
      redirectsCount++;
    } else {
      // Add finalUrl to the response object so the calling code can track it
      response.finalUrl = currentUrl;
      return response;
    }
  }

  throw new Error('Maximum redirects reached');
}

async function checkLinkHealth(url) {
  const start = Date.now();

  try {
    let response;

    // Try HEAD request first
    try {
      response = await requestWithSafeRedirects(url, 'head');
    } catch (headError) {
      if (headError.message === 'Access to private/unallowed URL is forbidden' || headError.message === 'Maximum redirects reached') {
        throw headError;
      }
      // Fallback to GET request
      response = await requestWithSafeRedirects(url, 'get');
    }

    const responseTime = Date.now() - start;

    let healthStatus = 'healthy';

    if (responseTime > 3000) {
      healthStatus = 'slow';
    }

    if (response.status >= 400) {
      healthStatus = 'broken';
    }

    return {
      success: true,
      healthStatus,
      statusCode: response.status,
      responseTime,
      checkedAt: new Date().toISOString(),
      finalUrl: response.finalUrl || url,
    };
  } catch (error) {
    return {
      success: false,
      healthStatus: 'broken',
      statusCode: null,
      responseTime: null,
      checkedAt: new Date().toISOString(),
      error: error.message,
    };
  }
}

module.exports = checkLinkHealth;