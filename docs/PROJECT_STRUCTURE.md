# Zaplink Project Structure

This document provides a comprehensive overview of the Zaplink project structure to help contributors understand the codebase organization.

## Directory Tree

```
zaplink/
├── config/                      # Configuration files
│   └── firebase.config.js      # Firebase Admin SDK configuration
│
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md         # System architecture and design
│   ├── CODE_OF_CONDUCT.md      # Community guidelines
│   ├── FIREBASE_SETUP.md       # Firebase setup instructions
│   └── SECURITY.md             # Security policies and reporting
│
├── public/                      # Frontend (client-side) assets
│   ├── assets/                 # Static assets
│   │   ├── icons/              # Icon files (SVG, PNG)
│   │   └── images/             # Image files
│   │
│   ├── css/                    # Stylesheets
│   │   ├── bio-preview.css     # Bio page specific styles
│   │   ├── landing.css         # Landing page styles
│   │   └── styles.css          # Main application styles
│   │
│   ├── js/                     # Client-side JavaScript modules
│   │   ├── app.js              # Main app logic (dashboard, links, analytics)
│   │   ├── auth.js             # Authentication (sign-in/out, tokens)
│   │   ├── bio-link.js         # Bio link page functionality
│   │   ├── firebase-config.example.js  # Firebase config template
│   │   ├── firebase-config.js  # Firebase client SDK config (not in git)
│   │   ├── globe.js            # 3D globe visualization
│   │   ├── globe-view.js       # Globe view controller
│   │   ├── landing.js          # Landing page interactions
│   │   └── qr-generator.js     # QR code generation and customization
│   │
│   ├── bio.html                # Bio link profile page
│   ├── countries.geojson       # Geographic data for globe
│   ├── index.html              # Main application page (dashboard)
│   └── landing.html            # Marketing landing page
│
├── scripts/                     # Utility and maintenance scripts
│   ├── README.md               # Scripts documentation
│   └── set-verified-badges.js # User verification badge management
│
├── src/                         # Server-side source code
│   ├── middleware/             # Express middleware
│   │   └── auth.middleware.js  # JWT token verification
│   │
│   ├── routes/                 # API routes (to be implemented)
│   │   └── (future route files)
│   │
│   ├── services/               # Business logic layer
│   │   └── memory.service.js   # In-memory storage (fallback)
│   │
│   └── utils/                  # Utility functions
│       └── url.utils.js        # URL helpers (validation, UTM, short codes)
│
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore patterns
├── CONTRIBUTING.md              # Contribution guidelines
├── LICENSE                      # Project license
├── package.json                 # NPM dependencies and scripts
├── README.md                    # Project overview and quick start
├── server.js                    # Express server entry point
└── vercel.json                  # Vercel deployment configuration
```

## Detailed Component Breakdown

### Configuration Layer (`config/`)

#### `firebase.config.js`
- Initializes Firebase Admin SDK
- Exports database and auth instances
- Defines Firestore collection names
- Handles initialization errors gracefully

**Key Exports:**
- `initializeFirebase()` - Initialize Firebase Admin
- `getDatabase()` - Get Firestore instance
- `getAuth()` - Get Firebase Auth instance
- `COLLECTIONS` - Collection name constants

---

### Documentation (`docs/`)

All project documentation is centralized here:

- **ARCHITECTURE.md**: System design, data flow, API specs
- **CODE_OF_CONDUCT.md**: Community behavior guidelines
- **FIREBASE_SETUP.md**: Step-by-step Firebase setup
- **SECURITY.md**: Security policies and vulnerability reporting

---

### Public Assets (`public/`)

#### HTML Pages

1. **landing.html**
   - Marketing page
   - Feature showcase
   - Call-to-action for sign-up

2. **index.html**
   - Main application dashboard
   - Link management interface
   - Analytics display
   - QR code generator

3. **bio.html**
   - Bio link profile page
   - Social media link aggregation
   - Custom branding

#### JavaScript Modules (`public/js/`)

**Core Application (`app.js`)**
- Dashboard rendering
- Link CRUD operations
- Analytics data fetching
- Socket.IO real-time updates
- Search and filtering
- Bug reporting

**Authentication (`auth.js`)**
- Google OAuth integration
- Sign-in/sign-out flow
- Token management
- Session handling

**Bio Links (`bio-link.js`)**
- Profile page rendering
- Link display and tracking
- Custom theming

**QR Generator (`qr-generator.js`)**
- QR code generation
- Pattern customization
- Logo/brand overlay
- Frame templates
- Download functionality

**Globe Visualization (`globe.js` + `globe-view.js`)**
- 3D globe rendering
- Geographic click data visualization
- Interactive controls

**Landing Page (`landing.js`)**
- Landing page interactions
- Form handling
- Smooth scrolling

**Firebase Client (`firebase-config.js`)**
- Firebase client SDK initialization
- Not tracked in git (use `.example` as template)

#### Stylesheets (`public/css/`)

**styles.css** - Main application styles
- Dashboard layout
- Link cards
- Analytics charts
- Responsive design

**landing.css** - Landing page styles
- Hero section
- Feature showcase
- Pricing tables

**bio-preview.css** - Bio page styles
- Profile layout
- Link buttons
- Custom themes

---

### Scripts (`scripts/`)

Utility scripts for maintenance and administration:

**set-verified-badges.js**
- Manages user verification status
- Updates Firestore user documents
- Admin tool

---

### Server Source (`src/`)

#### Middleware (`src/middleware/`)

**auth.middleware.js**
- Verifies Firebase ID tokens
- Extracts user info from JWT
- Protects routes requiring authentication

**Usage:**
```javascript
const { verifyToken } = require('./src/middleware/auth.middleware');
app.post('/api/links', verifyToken, createLink);
```

#### Services (`src/services/`)

**memory.service.js**
- In-memory data store (Map-based)
- Fallback when Firebase not configured
- Methods: getLink, setLink, deleteLink, getAnalytics

#### Utils (`src/utils/`)

**url.utils.js**
Comprehensive URL utilities:
- `generateShortCode()` - Create random short codes
- `parseUTMParams()` - Extract UTM from URL
- `addUTMParams()` - Add UTM to URL
- `getBaseUrl()` - Get request base URL
- `toFirestoreId()` - Convert for Firestore
- `fromFirestoreId()` - Convert from Firestore
- `isValidUrl()` - URL validation
- `validateCustomShortCode()` - Custom code validation

#### Routes (`src/routes/`)

*To be implemented* - Future modular route files:
- `links.routes.js` - Link CRUD endpoints
- `analytics.routes.js` - Analytics endpoints
- `user.routes.js` - User profile endpoints
- `qr.routes.js` - QR code generation endpoints

---

### Server Entry Point (`server.js`)

Main Express application:
- Express and Socket.IO setup
- Middleware configuration
- API route definitions
- Link redirect handling
- Real-time analytics broadcasting

**Current Routes:**
- `POST /api/shorten` - Create short link
- `GET /api/links` - Get user's links
- `GET /api/analytics/:code` - Get analytics
- `DELETE /api/links/:code` - Delete link
- `GET /:shortCode` - Redirect to original URL
- `POST /api/github/bug` - Report bug

---

## Design Patterns

### Modular Architecture

The codebase follows a modular pattern:
- **Separation of Concerns**: Each module has a single responsibility
- **Dependency Injection**: Services passed to route handlers
- **Config Centralization**: All config in `config/`

### Client-Server Separation

- **Client**: `public/` - Static assets served by Express
- **Server**: `src/` + `server.js` - Business logic and API

### Service Layer Pattern

Business logic is abstracted into services:
- `memory.service.js` - Data storage
- Future: `link.service.js`, `analytics.service.js`

## File Naming Conventions

- **Server files**: `kebab-case.js` (e.g., `auth.middleware.js`)
- **Client files**: `kebab-case.js` (e.g., `qr-generator.js`)
- **Config files**: `kebab-case.config.js`
- **Service files**: `kebab-case.service.js`
- **Utility files**: `kebab-case.utils.js`
- **Route files**: `kebab-case.routes.js`

## Adding New Features

### Frontend Feature

1. Add HTML to appropriate page (`index.html`, `bio.html`, etc.)
2. Create or update JS module in `public/js/`
3. Add styles in `public/css/`
4. Test responsiveness

### Backend Feature

1. Create route file in `src/routes/`
2. Create service in `src/services/` if needed
3. Add middleware in `src/middleware/` if needed
4. Add utilities in `src/utils/` if needed
5. Register routes in `server.js`

Example:
```javascript
// src/routes/users.routes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/profile', verifyToken, async (req, res) => {
  // Implementation
});

module.exports = router;

// In server.js
const userRoutes = require('./src/routes/users.routes');
app.use('/api/users', userRoutes);
```

## Environment Variables

Required in `.env`:
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_CLIENT_EMAIL` - Service account email
- `FIREBASE_PRIVATE_KEY` - Private key for auth
- `BASE_URL` - Application base URL
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

Optional:
- `GITHUB_TOKEN` - For bug reporting
- `GITHUB_REPO` - Target repository

## Dependencies

### Production Dependencies
- `express` - Web framework
- `socket.io` - Real-time communication
- `firebase-admin` - Backend Firebase SDK
- `nanoid` - Short code generation
- `qrcode` - QR code generation
- `globe.gl` - 3D globe visualization
- `dotenv` - Environment variables
- `cors` - CORS middleware
- `axios` - HTTP client

### Dev Dependencies
- `nodemon` - Auto-restart server

## Future Improvements

1. **Route Modularization**: Break `server.js` into route files
2. **Service Layer**: Extract business logic from routes
3. **Testing**: Add unit and integration tests
4. **API Documentation**: Generate API docs (Swagger/OpenAPI)
5. **TypeScript**: Gradual migration to TypeScript
6. **Code Splitting**: Split large client files

---

For more information, see:
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [README.md](../README.md) - Project overview

*Last updated: December 2025*
