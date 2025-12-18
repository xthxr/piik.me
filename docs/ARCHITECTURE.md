# Architecture Documentation

## System Overview

Link360 is a full-stack web application for URL shortening with real-time analytics. It follows a client-server architecture with Firebase as the backend service.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                     │
├─────────────────────────────────────────────────────────────┤
│  HTML (index.html)                                           │
│    ├── Landing Page                                          │
│    ├── Dashboard                                             │
│    ├── Analytics View                                        │
│    └── QR Generator                                          │
├─────────────────────────────────────────────────────────────┤
│  JavaScript Modules                                          │
│    ├── app.js (Main App Logic)                              │
│    ├── auth.js (Authentication)                             │
│    ├── qr-generator.js (QR Code Module)                     │
│    └── firebase-config.js (Firebase SDK Config)             │
├─────────────────────────────────────────────────────────────┤
│  CSS                                                         │
│    └── styles.css (Global Styles)                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
                    WebSocket (Socket.IO)
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Node.js + Express)                │
├─────────────────────────────────────────────────────────────┤
│  Routes & Middleware                                         │
│    ├── GET  /                 (Serve index.html)            │
│    ├── POST /api/links        (Create short link)           │
│    ├── GET  /api/links        (Get user links)              │
│    ├── GET  /api/analytics/:code (Get analytics)            │
│    ├── GET  /:shortCode       (Redirect & track)            │
│    └── POST /api/github/bug   (Create issue)                │
├─────────────────────────────────────────────────────────────┤
│  Socket.IO Server                                            │
│    └── Real-time analytics broadcasting                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    FIREBASE SERVICES                         │
├─────────────────────────────────────────────────────────────┤
│  Authentication (Firebase Auth)                              │
│    └── Google OAuth 2.0                                     │
├─────────────────────────────────────────────────────────────┤
│  Database (Firestore)                                        │
│    ├── Collection: links                                    │
│    ├── Collection: analytics                                │
│    └── Collection: users                                    │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. User Authentication Flow

```
User clicks "Sign In"
    ↓
auth.js → Firebase Auth SDK
    ↓
Google OAuth Popup
    ↓
Firebase returns ID Token
    ↓
Token stored in localStorage
    ↓
app.js validates token
    ↓
User dashboard loads
```

### 2. Link Creation Flow

```
User submits URL
    ↓
app.js validates input
    ↓
POST /api/links (with auth token)
    ↓
server.js verifies token
    ↓
Generate short code (nanoid)
    ↓
Save to Firestore (links collection)
    ↓
Initialize analytics document
    ↓
Return short URL to client
    ↓
UI updates with new link
```

### 3. Link Redirect Flow

```
User visits /:shortCode
    ↓
server.js fetches from Firestore
    ↓
Update analytics (clicks++)
    ↓
Emit Socket.IO event
    ↓
Redirect to original URL
    ↓
Connected clients receive update
    ↓
Dashboard updates in real-time
```

### 4. Real-time Analytics Flow

```
Click event occurs
    ↓
server.js updates Firestore
    ↓
Socket.IO broadcasts event
    ↓
All connected clients listening
    ↓
app.js receives event
    ↓
UI updates without refresh
```

## Module Breakdown

### Frontend Modules

#### `app.js` - Main Application Controller
- **Responsibilities:**
  - Page navigation and routing
  - Link CRUD operations
  - Analytics data fetching
  - Socket.IO client setup
  - Search and filtering
  - Bug reporting

- **Key Components:**
  - Navigation system
  - Modal dialogs
  - Dashboard rendering
  - Analytics charts
  - Real-time update handlers

#### `auth.js` - Authentication Module
- **Responsibilities:**
  - Google Sign-in/Sign-out
  - Token management
  - User session handling
  - Authentication state listeners

- **Functions:**
  - `signInWithGoogle()` - OAuth flow
  - `signOut()` - Clear session
  - `getAuthToken()` - Retrieve token
  - `getCurrentUser()` - Get user object

#### `qr-generator.js` - QR Code Module
- **Responsibilities:**
  - QR code generation
  - Pattern customization
  - Brand overlay
  - Download functionality
  - Quick link integration

- **Components:**
  - Canvas rendering
  - Pattern drawing algorithms
  - Color picker
  - Frame templates
  - Export functionality

### Backend Module

#### `server.js` - Express Server
- **Responsibilities:**
  - HTTP request handling
  - Firebase Admin operations
  - Socket.IO server
  - Authentication middleware
  - Business logic

- **Sections:**
  1. Firebase initialization
  2. Middleware setup
  3. Helper functions
  4. API routes
  5. Socket.IO handlers

## Database Schema

### Collection: `links`
```javascript
{
  // Document ID: shortCode (e.g., "abc123")
  originalUrl: "https://example.com/page",
  shortCode: "abc123",
  shortUrl: "https://link360.vercel.app/abc123",
  userId: "firebase_uid_here",
  userEmail: "user@example.com",
  createdAt: Timestamp,
  utmParams: {
    source: "google",
    medium: "cpc",
    campaign: "spring_sale",
    term: "keyword",
    content: "ad_variant"
  }
}
```

### Collection: `analytics`
```javascript
{
  // Document ID: shortCode (matches link)
  impressions: 150,        // Page views
  clicks: 45,              // Redirects
  shares: 12,              // Share actions
  devices: {
    mobile: 30,
    desktop: 15
  },
  browsers: {
    chrome: 25,
    firefox: 12,
    safari: 8
  },
  referrers: {
    "google.com": 20,
    "facebook.com": 10,
    "direct": 15
  },
  clickHistory: [
    {
      timestamp: Timestamp,
      device: "mobile",
      browser: "chrome",
      referrer: "https://google.com"
    }
  ]
}
```

## API Design

### RESTful Principles

- **Resource-based URLs**: `/api/links`, `/api/analytics/:id`
- **HTTP Methods**: GET, POST, PUT, DELETE
- **JSON responses**: All responses in JSON format
- **Status codes**: Proper HTTP status codes

### Authentication

Protected routes use Firebase ID tokens:
```http
Authorization: Bearer {firebase-id-token}
```

Middleware `verifyToken()` validates tokens on protected routes.

### Error Handling

```javascript
{
  "success": false,
  "error": "Error message here"
}
```

## Real-time Communication

### Socket.IO Events

**Server → Client:**
- `analyticsUpdate` - Broadcast analytics changes
  ```javascript
  {
    shortCode: "abc123",
    impressions: 150,
    clicks: 45,
    shares: 12
  }
  ```

**Client → Server:**
- Connection events (automatic)
- Heartbeat (automatic)

### Event Flow

1. Link event occurs (click, impression)
2. Server updates Firestore
3. Server emits Socket.IO event to all clients
4. Clients listening for that shortCode update UI
5. Dashboard shows real-time changes

## Security

### Authentication & Authorization

- **Firebase Auth** - Industry-standard OAuth
- **Token verification** - Every protected request validated
- **User isolation** - Users only see their own data

### Firestore Security Rules

```javascript
// Example rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /links/{linkId} {
      allow read: if true;  // Public read for redirects
      allow create: if request.auth != null 
        && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null 
        && resource.data.userId == request.auth.uid;
    }
    
    match /analytics/{linkId} {
      allow read: if true;  // Public read for stats
      allow write: if false;  // Only server writes
    }
  }
}
```

### Input Validation

- URL validation before shortening
- XSS prevention via Firebase escaping
- SQL injection not applicable (NoSQL database)

## Performance Optimizations

### Frontend

1. **Lazy Loading**
   - Analytics data loaded on-demand
   - Charts rendered only when visible

2. **Debouncing**
   - Search input debounced (300ms)
   - Filter updates debounced

3. **Efficient DOM Updates**
   - Virtual elements cached
   - Minimal reflows

### Backend

1. **Database Indexing**
   - Firestore auto-indexes on userId
   - Composite indexes for complex queries

2. **Connection Pooling**
   - Socket.IO manages connections efficiently
   - Automatic reconnection

3. **Caching**
   - Future: Redis for frequently accessed links
   - Future: CDN for static assets

## Scalability Considerations

### Horizontal Scaling

- **Stateless server** - Can run multiple instances
- **Socket.IO sticky sessions** - Use Redis adapter
- **Load balancer** - Distribute traffic

### Database Scaling

- **Firestore auto-scales** - Google Cloud infrastructure
- **Partitioning strategy** - Shard by user ID if needed
- **Read replicas** - Firestore handles automatically

### WebSocket Scaling

```javascript
// For multiple server instances
const RedisAdapter = require('socket.io-redis');
io.adapter(RedisAdapter({ host: 'localhost', port: 6379 }));
```

## Deployment

### Production Environment

- **Platform**: Vercel (serverless)
- **Node Version**: 16+
- **Environment Variables**: Stored in Vercel dashboard
- **HTTPS**: Automatic via Vercel
- **CDN**: Cloudflare (optional)

### CI/CD Pipeline

```
Code Push → GitHub
    ↓
Vercel auto-detects
    ↓
Build & Deploy
    ↓
Production Live
```

## Monitoring & Logging

### Current Logging

- Console logs for development
- Firebase Authentication logs
- Firestore audit logs

### Recommended Additions

1. **Error Tracking** - Sentry integration
2. **Performance Monitoring** - Firebase Performance
3. **Analytics** - Google Analytics
4. **Uptime Monitoring** - UptimeRobot

## Future Architecture Enhancements

1. **Microservices**
   - Separate QR generation service
   - Dedicated analytics service

2. **Caching Layer**
   - Redis for hot links
   - Reduce Firestore reads

3. **CDN Integration**
   - Serve static assets from edge
   - Reduce server load

4. **Worker Threads**
   - Background jobs for heavy processing
   - Async QR generation

5. **GraphQL API**
   - More flexible data fetching
   - Reduce over-fetching

---

This architecture supports the current feature set and is designed for easy extension and scaling.


## Modular Architecture (v2.0)

The application has been restructured into a clean, modular architecture for improved maintainability and contributor experience.

### Key Improvements

- **Separation of Concerns**: Server code organized into `src/` with dedicated folders
- **Configuration Layer**: Centralized Firebase config in `config/`
- **Documentation Hub**: All docs consolidated in `docs/`
- **Modular Services**: Business logic separated into service files
- **Utility Functions**: Reusable helpers in dedicated utils
- **Middleware Pattern**: Authentication and other middleware isolated

### New Directory Structure

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for complete details on the new organization.

### Benefits

- **Easier Contribution**: Clear structure makes it simple for new contributors
- **Better Testability**: Modular code is easier to unit test
- **Scalability**: Easy to add new features without cluttering existing files
- **Maintainability**: Single responsibility principle applied throughout
- **Code Reuse**: Shared utilities prevent duplication

---

*For the complete directory breakdown, see [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)*
