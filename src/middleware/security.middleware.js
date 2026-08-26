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

const {
    unauthenticatedLinkLimit,
    authenticatedLinkLimit,
    shortenLimiter,
    trackingLimit
} = require('./rateLimit.middleware');

module.exports = {
    securityHeaders,
    apiLimiter,
    bugReportLimiter,
    unauthenticatedLinkLimit,
    authenticatedLinkLimit,
    shortenLimiter,
    trackingLimit
};