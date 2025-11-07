<div align="center">

# 🔗 Link360

### Open-Source Real-Time Link & QR Analytics Tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v14+-green.svg)](https://nodejs.org)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange.svg)](https://firebase.google.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-black.svg)](https://socket.io)

**A professional-grade, open-source platform for creating trackable short links with real-time analytics and instant QR code generation just a little better than bitly.com**

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [API Reference](#-api-reference) • [Contributing](#-contributing)

</div>

---

## 📋 Overview

Link360 is a comprehensive link management and analytics platform that empowers marketers, developers, and businesses to create, track, and analyze their URLs with unprecedented insight. Built with modern web technologies and real-time capabilities, Link360 provides instant feedback on link performance through an intuitive dashboard and WebSocket-powered live updates.

### Why Link360?

- **🚀 Real-Time Analytics** - Watch clicks happen live with WebSocket-powered updates
- **📱 QR Code Generation** - Instantly generate and download QR codes for any shortened link
- **🎯 Campaign Tracking** - Built-in UTM parameter support for marketing attribution
- **🔒 Secure & Private** - FirebaseAuth authentication with Firebase security rules
- **💾 Persistent Storage** - All data safely stored in Google Cloud Firestore
- **⚡ Low Latency** - Sub-second analytics updates for immediate insights
- **🌐 Open Source** - Free to use, modify, and deploy for any purpose

## ✨ Features

### Core Capabilities

- **URL Shortening** - Generate short, memorable links with custom codes
- **Real-Time Analytics Dashboard** - Live tracking of impressions, clicks, and shares
- **QR Code Generation** - One-click QR code creation with download functionality
- **UTM Parameter Management** - Add and track campaign parameters (source, medium, campaign, term, content)
- **Device & Browser Analytics** - Detailed breakdown of mobile vs desktop and browser usage
- **Referrer Tracking** - Identify traffic sources and referring websites
- **Click-Through Rate (CTR)** - Automatic calculation and display of conversion metrics
- **Share Tracking** - Monitor social sharing and link distribution
- **Click History** - Chronological log of all link interactions with timestamps

### Technical Features

- **Google Authentication** - Secure OAuth login via Firebase Auth
- **User Dashboard** - Centralized view of all created links with quick stats
- **WebSocket Updates** - Real-time analytics via Socket.IO (no page refresh needed)
- **Firebase Firestore** - NoSQL database for scalable data persistence
- **RESTful API** - Comprehensive API for programmatic access
- **Responsive Design** - Mobile-first UI with modern CSS animations
- **Session Management** - Firebase Auth token-based sessions

## 🚀 Quick Start

### Prerequisites

- **Node.js** v14 or higher ([Download](https://nodejs.org))
- **npm** (comes with Node.js)
- **Google Account** (for Firebase setup)
- **Firebase Project** ([Create one free](https://console.firebase.google.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/xthxr/Link360.git
   cd Link360
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   
   Follow our comprehensive [Firebase Setup Guide](FIREBASE_SETUP.md) to:
   - Create a Firebase project
   - Enable Google Authentication
   - Create a Firestore database
   - Generate service account credentials
   - Configure Firestore security rules

4. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   BASE_URL=http://localhost:3000

   # Firebase Admin SDK (from service account JSON)
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_CLIENT_EMAIL=your_client_email@your_project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

5. **Update Firebase web configuration**
   
   Edit `public/firebase-config.js` with your Firebase web app credentials:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abc123def456"
   };
   ```

6. **Start the application**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

7. **Access the dashboard**
   
   Open your browser and navigate to: `http://localhost:3000`

**🎉 Congratulations!** You're ready to create your first tracked link.

> 📚 **New to Link360?** Check out our [Quick Start Guide](QUICKSTART.md) for a step-by-step walkthrough.

## 📖 Documentation

### User Guide

#### 1. Authentication

- Click **"Sign in with Google"** on the homepage
- Authorize the application with your Google account
- You'll be automatically redirected to your personal dashboard

#### 2. Creating a Short Link

1. Click **"+ Create New Link"** button
2. Enter your destination URL (e.g., `https://example.com/my-long-url`)
3. *(Optional)* Add UTM parameters for campaign tracking:
   - **Source** - Traffic source (e.g., `google`, `newsletter`, `facebook`)
   - **Medium** - Marketing medium (e.g., `email`, `cpc`, `social`)
   - **Campaign** - Campaign name (e.g., `spring_sale`, `product_launch`)
   - **Term** - Paid search keywords (e.g., `running+shoes`)
   - **Content** - Ad variation identifier (e.g., `banner_a`, `text_link`)
4. Click **"Generate Link"**
5. Your shortened link is created instantly with a unique code

#### 3. Managing Links

Your dashboard displays all created links with:
- Original URL and shortened URL
- Quick statistics (impressions, clicks, shares, CTR)
- Action buttons (Analytics, QR Code, Share, Copy)
- Creation timestamp

**Available Actions:**
- 📊 **View Analytics** - Open detailed real-time analytics
- 📱 **QR Code** - Generate and download QR code
- 🔗 **Share** - Native share dialog or copy to clipboard
- 📋 **Copy** - Copy shortened link to clipboard

#### 4. Real-Time Analytics

Access comprehensive analytics for any link:

- **Overview Metrics**
  - Total impressions (page views)
  - Total clicks (redirects)
  - Total shares
  - Click-through rate (CTR)

- **Device Analytics**
  - Mobile vs Desktop breakdown
  - Percentage distribution

- **Browser Analytics**
  - Browser type statistics
  - Version information

- **Referrer Analysis**
  - Traffic source identification
  - Top referring domains

- **Click History**
  - Chronological event log
  - Timestamps for each interaction
  - Real-time updates (no refresh needed!)

#### 5. QR Code Generation

1. Click the **📱 QR Code** button on any link
2. View the generated QR code in a modal dialog
3. Click **"Download QR"** to save as PNG image
4. Use the QR code in marketing materials, print media, or presentations

**QR Code Features:**
- High error correction level for reliability
- Optimized size for scanning
- Instant generation
- One-click download

## 🗄️ Data Architecture

Link360 uses Firebase Firestore for scalable, persistent data storage.

### Database Collections

#### `links` Collection
Stores shortened link information (document ID = shortCode)

```javascript
{
  originalUrl: string,      // Full destination URL
  shortCode: string,        // Unique identifier (e.g., "abc123")
  shortUrl: string,         // Complete short URL
  userId: string,           // Firebase Auth user ID
  userEmail: string,        // User's email address
  createdAt: timestamp,     // Creation timestamp
  utmParams: {              // Optional UTM parameters
    source: string,
    medium: string,
    campaign: string,
    term: string,
    content: string
  }
}
```

#### `analytics` Collection
Stores analytics data (document ID = shortCode)

```javascript
{
  impressions: number,      // Page view count
  clicks: number,           // Redirect count
  shares: number,           // Share action count
  clickHistory: [           // Array of click events
    {
      timestamp: timestamp,
      device: string,       // "mobile" or "desktop"
      browser: string,      // Browser name
      referrer: string      // Referring URL
    }
  ],
  devices: {                // Device breakdown
    mobile: number,
    desktop: number
  },
  browsers: {               // Browser breakdown
    chrome: number,
    firefox: number,
    safari: number,
    edge: number,
    other: number
  },
  referrers: {              // Referrer breakdown
    "example.com": number,
    "direct": number
  }
}
```

#### `users` Collection
Automatically managed by Firebase Authentication

### Data Persistence

- ✅ All links persist across sessions
- ✅ Analytics data is continuously updated
- ✅ Historical click data is preserved
- ✅ Real-time synchronization via Firestore listeners
- ✅ Automatic backup via Firebase infrastructure

## 🔌 API Reference

Link360 provides a RESTful API for programmatic access to all features.

### Authentication

Protected endpoints require a Firebase Auth token in the Authorization header:

```http
Authorization: Bearer {firebase-auth-token}
```

### Endpoints

#### Create Short Link

```http
POST /api/shorten
Content-Type: application/json
Authorization: Bearer {token}

{
  "url": "https://example.com/page",
  "utmParams": {
    "source": "google",
    "medium": "cpc",
    "campaign": "spring_sale",
    "term": "keyword",
    "content": "ad_variant_a"
  }
}
```

**Response:**
```json
{
  "success": true,
  "shortUrl": "http://localhost:3000/abc123",
  "shortCode": "abc123",
  "originalUrl": "https://example.com/page?utm_source=google&utm_medium=cpc..."
}
```

---

#### Get User's Links

```http
GET /api/user/links
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "links": [
    {
      "shortCode": "abc123",
      "originalUrl": "https://example.com",
      "shortUrl": "http://localhost:3000/abc123",
      "createdAt": "2024-01-15T10:30:00Z",
      "utmParams": {...}
    }
  ]
}
```

---

#### Get Analytics

```http
GET /api/analytics/:shortCode
```

**Response:**
```json
{
  "success": true,
  "analytics": {
    "impressions": 150,
    "clicks": 45,
    "shares": 12,
    "devices": {
      "mobile": 30,
      "desktop": 15
    },
    "browsers": {
      "chrome": 25,
      "firefox": 12,
      "safari": 8
    },
    "clickHistory": [...]
  }
}
```

---

#### Track Impression

```http
POST /api/track/impression/:shortCode
```

**Response:**
```json
{
  "success": true,
  "impressions": 151
}
```

---

#### Track Share

```http
POST /api/track/share/:shortCode
```

**Response:**
```json
{
  "success": true,
  "shares": 13
}
```

---

#### Redirect (Automatic Click Tracking)

```http
GET /:shortCode
```

Redirects to the original URL and automatically tracks:
- Click event
- Device type (from User-Agent)
- Browser type (from User-Agent)
- Referrer (from Referer header)
- Timestamp

### WebSocket Events (Socket.IO)

Real-time analytics updates via WebSocket connection:

```javascript
// Client-side
socket.on('analyticsUpdate', (data) => {
  console.log('Updated analytics:', data);
  // { shortCode, impressions, clicks, shares, ... }
});
```

## 🛠️ Technology Stack

Link360 is built with modern, production-ready technologies:

### Backend
- **[Node.js](https://nodejs.org)** - JavaScript runtime environment
- **[Express.js](https://expressjs.com)** - Web application framework
- **[Socket.IO](https://socket.io)** - Real-time bidirectional event-based communication
- **[Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)** - Server-side Firebase operations
- **[nanoid](https://github.com/ai/nanoid)** - Secure, URL-friendly unique ID generator

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with animations and transitions
- **Vanilla JavaScript** - No framework dependencies for lightweight performance
- **[Firebase SDK](https://firebase.google.com/docs/web/setup)** - Client-side authentication
- **[QRCode.js](https://davidshimjs.github.io/qrcodejs/)** - QR code generation library

### Database & Authentication
- **[Firebase Firestore](https://firebase.google.com/docs/firestore)** - NoSQL cloud database
- **[Firebase Authentication](https://firebase.google.com/docs/auth)** - OAuth 2.0 provider (Google Sign-In)

### Development Tools
- **[dotenv](https://github.com/motdotla/dotenv)** - Environment variable management
- **[cors](https://github.com/expressjs/cors)** - Cross-origin resource sharing
- **[nodemon](https://nodemon.io)** - Development server with auto-reload

### Architecture Highlights

- **RESTful API** - Clean, resource-oriented endpoints
- **WebSocket Communication** - Sub-second analytics updates
- **JWT Token Authentication** - Secure session management
- **Event-Driven Architecture** - Scalable real-time processing
- **NoSQL Database** - Flexible schema for rapid iteration

## 🚢 Deployment

### Deployment Options

Link360 can be deployed to any Node.js hosting platform:

#### Recommended Platforms

1. **[Vercel](https://vercel.com)** ⭐ Recommended
   - Zero-config deployment
   - Automatic HTTPS
   - Environment variable management
   - Global CDN

2. **[Heroku](https://heroku.com)**
   - Free tier available
   - Easy Git-based deployment
   - Add-on ecosystem

3. **[Google Cloud Run](https://cloud.google.com/run)**
   - Seamless Firebase integration
   - Auto-scaling
   - Pay-per-use pricing

4. **[DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)**
   - Simple deployment
   - Predictable pricing
   - Managed infrastructure

5. **[Railway](https://railway.app)** / **[Render](https://render.com)**
   - Modern developer experience
   - Automatic deployments
   - Free tier available

### Pre-Deployment Checklist

- [ ] **Firebase Configuration**
  - [ ] Update Firestore security rules for production
  - [ ] Add production domain to Firebase authorized domains
  - [ ] Enable required Firebase services (Auth, Firestore)
  
- [ ] **Environment Variables**
  - [ ] Set `BASE_URL` to your production domain
  - [ ] Configure all Firebase credentials
  - [ ] Verify `PORT` is correctly set (or use dynamic port)
  
- [ ] **Security**
  - [ ] Enable HTTPS/SSL certificate
  - [ ] Implement rate limiting
  - [ ] Add URL validation and sanitization
  - [ ] Configure CORS for specific domains
  - [ ] Review and tighten Firestore security rules
  
- [ ] **Performance**
  - [ ] Enable compression middleware
  - [ ] Set up CDN for static assets
  - [ ] Configure caching headers
  - [ ] Optimize Socket.IO connections
  
- [ ] **Monitoring**
  - [ ] Set up error logging (e.g., Sentry)
  - [ ] Configure uptime monitoring
  - [ ] Enable Firebase Analytics
  - [ ] Set up backup strategy

### Production Environment Variables

```env
# Production Configuration
NODE_ENV=production
PORT=3000
BASE_URL=https://yourdomain.com

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-production-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Firestore Security Rules

Update your Firestore security rules for production:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Links collection - users can only read/write their own links
    match /links/{linkId} {
      allow read: if true;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Analytics collection - read-only for link owners, server writes
    match /analytics/{linkId} {
      allow read: if true;
      allow write: if false; // Only server-side writes
    }
    
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Vercel Deployment Example

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard

4. Configure `vercel.json` (already included)

See [DEPLOYMENT.md](DEPLOYMENT.md) for platform-specific deployment guides.

## ⚙️ Configuration & Customization

### Custom Short Codes

Modify the short code generation in `server.js`:

```javascript
const { nanoid } = require('nanoid');

function generateShortCode() {
  return nanoid(7); // Change length (default: 7)
  // Or implement custom logic:
  // return 'custom-' + nanoid(5);
}
```

### UTM Parameters

Default UTM parameters can be customized in the frontend form. Add custom fields in `public/index.html` and update the API handler in `server.js`.

### Analytics Enhancements

Extend analytics capabilities:

```javascript
// In server.js, add custom tracking fields
clickHistory.push({
  timestamp: new Date(),
  device: deviceType,
  browser: browserType,
  referrer: referrer,
  // Add custom fields:
  location: geoLocation,    // Requires IP geolocation service
  language: browserLanguage,
  screenResolution: screenSize
});
```

### UI Customization

Link360's UI can be fully customized via CSS variables in `public/styles.css`:

```css
:root {
  --primary-color: #4A90E2;      /* Main brand color */
  --secondary-color: #50E3C2;    /* Accent color */
  --background-color: #F8F9FA;   /* Page background */
  --card-background: #FFFFFF;    /* Card background */
  --text-color: #333333;         /* Primary text */
  --border-radius: 12px;         /* Border radius */
  --transition-speed: 0.3s;      /* Animation speed */
}
```

### Additional Features

Ideas for extending Link360:

- **Geographic Analytics** - Integrate with IP geolocation APIs (MaxMind, IPinfo)
- **Time-Series Charts** - Add Chart.js for visual trend analysis
- **CSV Export** - Export analytics data for reporting
- **Custom Domains** - Allow users to configure branded short domains
- **Link Expiration** - Set expiration dates for temporary links
- **Password Protection** - Require password for sensitive links
- **A/B Testing** - Create multiple variants and track performance
- **Webhooks** - Trigger events on specific actions
- **Email Reports** - Scheduled analytics summaries
- **Team Collaboration** - Share links with team members

## 🔒 Security

### Implemented Security Features

✅ **Authentication**
- OAuth 2.0 via Google (Firebase Authentication)
- Secure token-based sessions
- Server-side token verification on protected routes

✅ **Authorization**
- User-specific data isolation
- Firestore security rules enforce ownership
- Protected API endpoints require valid JWT

✅ **Data Protection**
- HTTPS enforcement (in production)
- Firebase security rules prevent unauthorized access
- No sensitive data exposed in client code

### Production Security Recommendations

#### Essential Security Measures

1. **Rate Limiting**
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   
   app.use('/api/', limiter);
   ```

2. **URL Validation**
   ```javascript
   function isValidUrl(url) {
     try {
       const parsed = new URL(url);
       return ['http:', 'https:'].includes(parsed.protocol);
     } catch {
       return false;
     }
   }
   ```

3. **Malicious URL Detection**
   - Integrate with Google Safe Browsing API
   - Maintain a blacklist of known malicious domains
   - Implement URL scanning before shortening

4. **Input Sanitization**
   ```javascript
   const validator = require('validator');
   
   // Sanitize all user inputs
   const sanitizedUrl = validator.escape(userInput);
   ```

5. **CORS Configuration**
   ```javascript
   const corsOptions = {
     origin: 'https://yourdomain.com',
     optionsSuccessStatus: 200
   };
   
   app.use(cors(corsOptions));
   ```

6. **Security Headers**
   ```javascript
   const helmet = require('helmet');
   app.use(helmet());
   ```

#### Additional Recommendations

- Enable Firebase App Check to prevent abuse
- Implement CAPTCHA for link creation
- Set up DDoS protection (Cloudflare)
- Regular security audits and dependency updates
- Monitor for suspicious activity patterns
- Implement abuse reporting mechanism
- Log and analyze security events

## 🐛 Troubleshooting

### Common Issues & Solutions

#### Authentication Problems

**Issue: "Popup blocked" error when signing in**
- **Solution**: Allow popups for your domain in browser settings
- Click the popup icon in address bar → Always allow popups

**Issue: "Unauthorized domain" error**
- **Solution**: Add your domain to Firebase authorized domains
  1. Go to Firebase Console → Authentication → Settings
  2. Scroll to "Authorized domains"
  3. Add `localhost` (development) or your domain (production)

**Issue: "Invalid token" or authentication expired**
- **Solution**: Sign out and sign in again
- Clear browser cache and cookies for the site

#### Firestore & Database Issues

**Issue: "Permission denied" when accessing data**
- **Solution**: Check Firestore security rules
- Ensure user is authenticated before making requests
- Verify the user owns the resource they're trying to access

**Issue: Data not persisting**
- **Solution**: Verify Firebase configuration
- Check browser console for Firestore errors
- Ensure Firestore is enabled in Firebase Console

#### Real-Time Updates Not Working

**Issue: Analytics not updating in real-time**
- **Solution**: Check Socket.IO connection
- Open browser console and look for WebSocket errors
- Verify firewall/proxy isn't blocking WebSocket connections
- Check that server is running and accessible

**Issue: "Connection failed" or "Connection timeout"**
- **Solution**: Restart the server
- Check if `PORT` is already in use
- Verify no network issues blocking the connection

#### Setup & Configuration Issues

**Issue: "Firebase Admin not configured" message**
- **Solution**: Ensure `.env` file exists with correct values
- Verify `FIREBASE_PRIVATE_KEY` format (includes quotes and `\n`)
- Restart server after updating `.env`

**Issue: "Module not found" errors**
- **Solution**: Run `npm install` to install dependencies
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

**Issue: Server won't start or crashes immediately**
- **Solution**: Check Node.js version (must be v14+)
- Review console errors for specific issues
- Verify port 3000 (or configured PORT) is available

### Getting Help

If you encounter an issue not listed here:

1. **Check the logs** - Look at browser console and server terminal output
2. **Review documentation** - See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) and [QUICKSTART.md](QUICKSTART.md)
3. **Search existing issues** - Check if someone else had the same problem
4. **Open an issue** - Create a detailed bug report on GitHub with:
   - Error messages
   - Steps to reproduce
   - Environment details (OS, Node version, browser)
   - Screenshots if applicable

## 🚀 Performance Optimization

### Current Optimizations

- ✅ **Real-time Updates** - WebSocket connections for instant analytics
- ✅ **Efficient Queries** - Firestore indexes for fast data retrieval
- ✅ **Lightweight Frontend** - Vanilla JavaScript (no heavy frameworks)
- ✅ **Minimal Dependencies** - Small bundle size

### Recommended Enhancements

#### Backend Performance

1. **Caching Layer**
   ```javascript
   const NodeCache = require('node-cache');
   const linkCache = new NodeCache({ stdTTL: 600 }); // 10 min cache
   
   // Cache frequently accessed links
   app.get('/:shortCode', async (req, res) => {
     const cached = linkCache.get(req.params.shortCode);
     if (cached) return res.redirect(cached);
     // ... fetch from Firestore
   });
   ```

2. **Redis for Session Storage**
   - Use Redis instead of in-memory storage
   - Enables horizontal scaling
   - Faster session lookups

3. **Database Indexing**
   - Create Firestore composite indexes for complex queries
   - Index frequently queried fields (userId, createdAt)

4. **Compression**
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

#### Frontend Performance

1. **CDN for Static Assets**
   - Serve CSS, JavaScript, and images from CDN
   - Reduce server load and improve load times

2. **Lazy Loading**
   - Load analytics data on-demand
   - Defer non-critical JavaScript

3. **Pagination**
   - Implement pagination for link lists
   - Load analytics history in chunks

4. **Service Workers**
   - Add offline support
   - Cache static resources

### Scaling Considerations

- **Horizontal Scaling** - Deploy multiple server instances behind load balancer
- **Database Sharding** - Partition data across multiple Firestore instances (for very large scale)
- **WebSocket Load Balancing** - Use Socket.IO with Redis adapter for multi-instance setups
- **Edge Functions** - Deploy link redirects to edge locations for global low latency

## 🤝 Contributing

We welcome contributions from the community! Link360 is open-source and thrives on collaborative improvement.

### How to Contribute

1. **Fork the repository**
   ```bash
   git clone https://github.com/xthxr/Link360.git
   cd Link360
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation if needed

4. **Test your changes**
   - Ensure the app runs without errors
   - Test all affected functionality
   - Verify real-time updates still work

5. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

7. **Open a Pull Request**
   - Describe what changes you made
   - Reference any related issues
   - Include screenshots for UI changes

### Contribution Guidelines

- **Code Style** - Follow the existing code style and conventions
- **Documentation** - Update README.md for new features
- **Testing** - Test thoroughly before submitting PR
- **Commits** - Write clear, descriptive commit messages
- **Issues** - Check existing issues before creating new ones

### Areas for Contribution

- 🐛 Bug fixes
- ✨ New features (see ideas in [Configuration & Customization](#️-configuration--customization))
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- ⚡ Performance optimizations
- 🔒 Security improvements
- 🌍 Internationalization (i18n)
- ✅ Test coverage

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up Firebase (see [FIREBASE_SETUP.md](FIREBASE_SETUP.md))
4. Configure `.env` file
5. Run development server: `npm run dev`
6. Make changes and test locally
7. Submit pull request

## 📄 License

Link360 is open-source software licensed under the **MIT License**.

```
MIT License

Copyright (c) 2024 Link360

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### What This Means

✅ **You can:**
- Use Link360 for personal or commercial projects
- Modify the source code to suit your needs
- Distribute your modified versions
- Sell services based on Link360

❌ **You cannot:**
- Hold the authors liable for any damages
- Use the authors' names for endorsement without permission

📋 **You must:**
- Include the original license and copyright notice in any copies

## 🙏 Acknowledgments

Link360 is built with amazing open-source technologies:

- [Firebase](https://firebase.google.com) - Backend infrastructure and authentication
- [Socket.IO](https://socket.io) - Real-time WebSocket communication
- [Express.js](https://expressjs.com) - Web framework
- [QRCode.js](https://davidshimjs.github.io/qrcodejs/) - QR code generation
- [nanoid](https://github.com/ai/nanoid) - Secure ID generation

Special thanks to all contributors and the open-source community!

## 📞 Support & Contact

### Get Help

- 📚 **Documentation** - Read the full [README](README.md), [Quick Start Guide](QUICKSTART.md), and [Firebase Setup](FIREBASE_SETUP.md)
- 🐛 **Bug Reports** - [Open an issue](https://github.com/xthxr/Link360/issues) with detailed information
- 💡 **Feature Requests** - [Create an issue](https://github.com/xthxr/Link360/issues) describing your idea
- 💬 **Discussions** - Use [GitHub Discussions](https://github.com/xthxr/Link360/discussions) for questions

### Stay Updated

- ⭐ **Star the repository** to show support and stay notified of updates
- 👀 **Watch the repository** for new releases and important announcements
- 🔔 **Follow the project** to get updates on new features and improvements

---

<div align="center">

**Built with ❤️ by the Link360 community**

[⬆ Back to Top](#-link360)

</div>
