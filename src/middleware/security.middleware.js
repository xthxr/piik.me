const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Security headers middleware
 */
const securityHeaders = helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            objectSrc: ["'none'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://www.gstatic.com',
                'https://cdn.jsdelivr.net',
                'https://unpkg.com',
                'https://cdnjs.cloudflare.com'
            ],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://fonts.googleapis.com',
                'https://cdnjs.cloudflare.com'
            ],
            fontSrc: [
                "'self'",
                'https://fonts.gstatic.com',
                'https://cdnjs.cloudflare.com',
                'data:'
            ],
            imgSrc: ["'self'", 'data:', 'blob:', 'https://unpkg.com', 'https://*'],
            connectSrc: [
                "'self'",
                'https://api.github.com',
                'https://*.googleapis.com',
                'https://identitytoolkit.googleapis.com',
                'https://securetoken.googleapis.com',
                'https://firestore.googleapis.com',
                'https://www.googleapis.com',
                'https://*.firebaseio.com',
                'ws:',
                'wss:'
            ],
            workerSrc: ["'self'", 'blob:'],
            frameSrc: ["'self'"]
        }
    }
});

/**
 * Global API rate limiter
 */
const apiLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many requests, please try again later.'
    }
});

/**
 * Strict rate limiter for the bug-report endpoint.
 * Each IP is capped at 5 reports per hour. The endpoint uses the server's
 * GITHUB_TOKEN to create GitHub issues, so unrestricted access lets any
 * caller exhaust the token's API quota and flood the repository with spam.
 */
const bugReportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many bug reports submitted. Please wait before trying again.'
    }
});

/**
 * Rate limiter for creating short links.
 *
 * /api/shorten requires verifyToken, so every request that reaches this limiter already
 * carries an Authorization header -- a skip-if-authenticated rule would exempt every real
 * request and rate-limit nothing. Applied by IP to every request instead.
 */
const createLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many short links created from this IP, please try again after an hour'
    }
});

/**
 * Rate limiter for analytics tracking.
 */
const trackLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 tracking requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again after 15 minutes'
    }
});

module.exports = { securityHeaders, apiLimiter, bugReportLimiter, createLimiter, trackLimiter };