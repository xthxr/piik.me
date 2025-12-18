# Server Source Code

This directory contains the server-side source code for Zaplink.

## Structure

```
src/
├── middleware/      # Express middleware functions
├── routes/          # API route handlers
├── services/        # Business logic services
└── utils/           # Helper functions and utilities
```

## Middleware

**Location**: `src/middleware/`

Middleware functions that process requests before they reach route handlers.

### auth.middleware.js
- Verifies Firebase authentication tokens
- Extracts user information from JWT
- Protects routes requiring authentication

**Usage:**
```javascript
const { verifyToken } = require('./middleware/auth.middleware');
app.post('/api/links', verifyToken, createLink);
```

## Routes

**Location**: `src/routes/`

API route handlers organized by feature.

### Future Routes
- `links.routes.js` - Link management (CRUD)
- `analytics.routes.js` - Analytics data
- `user.routes.js` - User profiles
- `qr.routes.js` - QR code generation

**Pattern:**
```javascript
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  // Handler implementation
});

module.exports = router;
```

## Services

**Location**: `src/services/`

Business logic layer - handles data operations and complex logic.

### memory.service.js
- In-memory data store (fallback when Firebase not configured)
- Methods: getLink, setLink, deleteLink, getAnalytics
- Used for development without Firebase setup

**Future Services:**
- `link.service.js` - Link management logic
- `analytics.service.js` - Analytics calculations
- `user.service.js` - User operations

## Utils

**Location**: `src/utils/`

Reusable utility functions.

### url.utils.js
URL-related utilities:
- `generateShortCode()` - Generate random short codes
- `parseUTMParams()` - Extract UTM parameters from URL
- `addUTMParams()` - Add UTM parameters to URL
- `getBaseUrl()` - Get base URL from request
- `toFirestoreId()` - Convert to Firestore-safe ID
- `fromFirestoreId()` - Convert from Firestore ID
- `isValidUrl()` - Validate URL format
- `validateCustomShortCode()` - Validate custom codes

**Usage:**
```javascript
const { generateShortCode, isValidUrl } = require('./utils/url.utils');

if (isValidUrl(url)) {
  const code = generateShortCode();
}
```

## Adding New Code

### New Middleware
1. Create file in `src/middleware/`
2. Export middleware function
3. Import and use in routes

### New Route
1. Create file in `src/routes/`
2. Define Express router
3. Register in `server.js`

### New Service
1. Create file in `src/services/`
2. Export service methods
3. Import in routes

### New Utility
1. Create file in `src/utils/`
2. Export utility functions
3. Import where needed

## Best Practices

- **Single Responsibility**: Each file should have one clear purpose
- **Exports**: Use named exports for clarity
- **Error Handling**: Always handle errors gracefully
- **Documentation**: Add JSDoc comments to all functions
- **Testing**: Write tests for critical logic (future)

---

For more information, see:
- [../docs/PROJECT_STRUCTURE.md](../docs/PROJECT_STRUCTURE.md) - Complete project structure
- [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) - System architecture
- [../CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
