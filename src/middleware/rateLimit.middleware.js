const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for unauthenticated link creation requests.
 * Capped at 5 requests per hour per IP address.
 */
const unauthenticatedLinkLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many links created. Please sign in for higher limits.'
    }
});

/**
 * Rate limiter for authenticated link creation requests.
 * Capped at 50 requests per hour per user (or fallback to IP).
 */
const authenticatedLinkLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
    keyGenerator: (req) => req.user?.uid || req.ip,
    validate: { keyGeneratorIpFallback: false },
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Hourly link creation limit reached. Try again in an hour.'
    }
});

/**
 * Dynamic rate limiter for the link creation endpoint (/api/shorten).
 * Automatically delegates to authenticated or unauthenticated limiter based on session state.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const shortenLimiter = (req, res, next) => {
    if (req.user) {
        return authenticatedLinkLimit(req, res, next);
    }
    return unauthenticatedLinkLimit(req, res, next);
};

/**
 * Rate limiter for impression and share tracking endpoints.
 * Capped at 30 requests per minute per IP address and shortCode to prevent analytics spam.
 */
const trackingLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    keyGenerator: (req) => `${req.ip}:${req.params.shortCode || ''}`,
    validate: { keyGeneratorIpFallback: false },
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many tracking requests. Please try again later.'
    }
});

module.exports = {
    unauthenticatedLinkLimit,
    authenticatedLinkLimit,
    shortenLimiter,
    trackingLimit
};
