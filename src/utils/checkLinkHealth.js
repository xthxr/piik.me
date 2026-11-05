const axios = require('axios');

async function checkLinkHealth(url) {
  const start = Date.now();

  try {
    let response;

    // Try HEAD request first
    try {
      response = await axios.head(url, {
        timeout: 5000,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });
    } catch (headError) {
      // Fallback to GET request
      response = await axios.get(url, {
        timeout: 5000,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });
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
      finalUrl:
        response.request?.res?.responseUrl || url,
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