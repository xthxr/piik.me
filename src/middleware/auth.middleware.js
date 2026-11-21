const { getAuth } = require('../../config/firebase.config');

/**
 * Middleware to verify Firebase authentication token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */

async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // Check if authorization header exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token missing'
      });
    }

    // Extract token
    const token = authHeader.substring(7);

    const auth = getAuth();

    // Verify token and check for revoked sessions
    const decodedToken = await auth.verifyIdToken(token, true);

    // Attach user data to request
    req.user = decodedToken;

    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error.code);

    switch (error.code) {
      case 'auth/id-token-expired':
        return res.status(401).json({
          success: false,
          error: 'Token expired'
        });

      case 'auth/id-token-revoked':
        return res.status(401).json({
          success: false,
          error: 'Token revoked'
        });

      case 'auth/argument-error':
        return res.status(401).json({
          success: false,
          error: 'Malformed token'
        });

      default:
        return res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
    }
  }
}

/**
 * Middleware to optionally verify Firebase authentication token if provided
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    const token = authHeader.substring(7);
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token, true);
    req.user = decodedToken;
  } catch (error) {
    // If token verification fails, proceed as unauthenticated without throwing
    console.debug('Optional auth token check failed:', error.code || error.message);
  }
  next();
}

module.exports = { verifyToken, optionalAuth };