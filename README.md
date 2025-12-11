<div align="center">

# 🔗 piik.me

### Open-Source Real-Time Link & QR Analytics Platform with Bio Links

[![License:  MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v14+-green.svg)](https://nodejs.org)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange.svg)](https://firebase.google.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--time-black.svg)](https://socket.io)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black.svg)](https://vercel.com)

**A professional-grade, open-source platform for creating trackable short links, personalized bio pages, and real-time analytics with instant QR code generation — a better alternative to bitly. com**

[Features](#-features) • [Quick Start](#-quick-start) • [Tech Stack](#-technology-stack) • [API Reference](#-api-reference) • [Contributing](#-contributing)

</div>

---

## 📋 Overview

piik.me is a comprehensive link management and analytics platform that empowers marketers, developers, and businesses to create, track, and analyze their URLs with unprecedented insight.  Built with modern web technologies and real-time capabilities, it offers everything from URL shortening to personalized bio link pages. 

### Why piik.me?

- **🚀 Real-Time Analytics** - Watch clicks happen live with WebSocket-powered updates
- **📱 QR Code Generation** - Instantly generate and download customizable QR codes
- **🎯 Campaign Tracking** - Built-in UTM parameter support for marketing attribution
- **👤 Bio Links** - Create stunning personalized bio pages with social links (like Linktree)
- **✅ Verified Badges** - Premium verification system for early adopters
- **🎨 Holographic UI** - Beautiful glassmorphism design with 3D parallax effects
- **🔒 Secure & Private** - Firebase Authentication with security rules
- **💾 Persistent Storage** - All data safely stored in Google Cloud Firestore
- **⚡ Low Latency** - Sub-second analytics updates for immediate insights
- **🌐 Open Source** - Free to use, modify, and deploy for any purpose

---

## ✨ Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **URL Shortening** | Generate short, memorable links with custom codes |
| **Custom Short Codes** | Choose your own vanity URLs with real-time availability checking |
| **Real-Time Analytics Dashboard** | Live tracking of impressions, clicks, and shares |
| **QR Code Generation** | One-click QR code creation with download functionality |
| **UTM Parameter Management** | Add and track campaign parameters (source, medium, campaign, term, content) |
| **Device & Browser Analytics** | Detailed breakdown of mobile vs desktop and browser usage |
| **Referrer Tracking** | Identify traffic sources and referring websites |
| **Click-Through Rate (CTR)** | Automatic calculation and display of conversion metrics |
| **Share Tracking** | Monitor social sharing and link distribution |
| **Click History** | Chronological log of all link interactions with timestamps |

### 👤 Bio Links (New!)

Create personalized bio pages accessible at `piik.me/username`:

- **Custom Profile Pages** - Display name, bio, and profile picture
- **Multiple Link Support** - Add unlimited social links with icons
- **Drag & Drop Ordering** - Easily reorder links with drag-and-drop functionality
- **Live Preview** - See changes in real-time while editing
- **Auto-Save** - Changes save automatically without manual intervention
- **Background Styles** - Multiple animated background options including:
  - Animated radial gradients
  - Mesh gradient effects
  - Glassmorphism overlays
- **Verified Badges** - Blue checkmark verification for early adopters
- **"Under Review" Status** - Unverified profiles display review status
- **Link Previews** - Automatic favicon and URL previews for each link
- **Magnetic Hover Effects** - Interactive hover animations on links

### 🎨 Visual Enhancements

- **Holographic UI Design** - Modern glassmorphism aesthetic
- **3D Parallax Tilt Effects** - Interactive card animations
- **Animated Mesh Gradients** - Dynamic background animations
- **Magnetic Interactions** - Engaging hover states
- **Responsive Design** - Mobile-first UI with modern CSS animations
- **Loading Animations** - Rotating logo on black background

### Technical Features

- **Google Authentication** - Secure OAuth login via Firebase Auth
- **User Dashboard** - Centralized view of all created links with quick stats
- **WebSocket Updates** - Real-time analytics via Socket.IO (no page refresh needed)
- **Firebase Firestore** - NoSQL database for scalable data persistence
- **RESTful API** - Comprehensive API for programmatic access
- **Custom Short Code Validation** - Real-time checking with improved UX (300ms debounce)
- **Firestore Server Timestamps** - Proper sorting and display of creation dates
- **Session Management** - Firebase Auth token-based sessions

---

## 🛠️ Technology Stack

piik.me is built with modern, production-ready technologies:

### Backend

| Technology | Purpose |
|------------|---------|
| **[Node.js](https://nodejs.org)** | JavaScript runtime environment |
| **[Express.js](https://expressjs.com)** | Web application framework |
| **[Socket.IO](https://socket.io)** | Real-time bidirectional event-based communication |
| **[Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)** | Server-side Firebase operations |
| **[nanoid](https://github.com/ai/nanoid)** | Secure, URL-friendly unique ID generator |
| **[Axios](https://axios-http.com)** | HTTP client for API requests |
| **[QRCode](https://github.com/soldair/node-qrcode)** | Server-side QR code generation |

### Frontend

| Technology | Purpose |
|------------|---------|
| **HTML5** | Semantic markup |
| **CSS3** | Modern styling with glassmorphism, animations, and transitions |
| **Vanilla JavaScript** | Lightweight, no-framework frontend |
| **[Firebase SDK](https://firebase.google.com/docs/web/setup)** | Client-side authentication |
| **[QRCode.js](https://davidshimjs.github.io/qrcodejs/)** | Client-side QR code generation |
| **[Three.js](https://threejs.org)** | 3D graphics and animations |
| **[Globe.gl](https://globe.gl)** | Interactive 3D globe visualizations |
| **[D3 Scale](https://github.com/d3/d3-scale)** | Data visualization utilities |

### Database & Authentication

| Service | Purpose |
|---------|---------|
| **[Firebase Firestore](https://firebase.google.com/docs/firestore)** | NoSQL cloud database |
| **[Firebase Authentication](https://firebase.google.com/docs/auth)** | OAuth 2.0 provider (Google Sign-In) |

### Development Tools

| Tool | Purpose |
|------|---------|
| **[dotenv](https://github.com/motdotla/dotenv)** | Environment variable management |
| **[cors](https://github.com/expressjs/cors)** | Cross-origin resource sharing |
| **[nodemon](https://nodemon.io)** | Development server with auto-reload |

### Deployment

| Platform | Purpose |
|----------|---------|
| **[Vercel](https://vercel.com)** | Serverless deployment with automatic HTTPS |

### Architecture Highlights

- **RESTful API** - Clean, resource-oriented endpoints
- **WebSocket Communication** - Sub-second analytics updates
- **JWT Token Authentication** - Secure session management
- **Event-Driven Architecture** - Scalable real-time processing
- **NoSQL Database** - Flexible schema for rapid iteration
- **Client-Server Architecture** - Separated concerns with Firebase backend

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "axios": "^1.13.2",
    "cors": "^2.8.5",
    "d3-scale": "^4.0.2",
    "d3-scale-chromatic": "^3.1.0",
    "dotenv": "^16.3.1",
    "express":  "^4.18.2",
    "firebase": "^12.4.0",
    "firebase-admin": "^13.5.0",
    "globe.gl": "^2.45.0",
    "nanoid": "^3.3.7",
    "qrcode": "^1.5.4",
    "socket.io":  "^4.6.1",
    "three":  "^0.181.2"
  },
  "devDependencies":  {
    "nodemon": "^3.0.1"
  }
}
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v14 or higher ([Download](https://nodejs.org))
- **npm** (comes with Node.js)
- **Google Account** (for Firebase setup)
- **Firebase Project** ([Create one free](https://console.firebase.google.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/xthxr/piik.me.git
   cd piik.me
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   
   - Create a Firebase project
   - Enable Google Authentication
   - Create a Firestore database
   - Generate service account credentials
   - Configure Firestore security rules

4. **Configure environment variables**
   
   Create a `.env` file in the root directory (see `.env.example`):
   ```env
   PORT=3000
   BASE_URL=http://localhost:3000

   # Firebase Admin SDK (from service account JSON)
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_CLIENT_EMAIL=your_client_email@your_project. iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

5. **Update Firebase web configuration**
   
   Edit `public/js/firebase-config.js` with your Firebase web app credentials. 

6. **Start the application**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

7. **Access the dashboard**
   
   Open your browser and navigate to:  `http://localhost:3000`

---

## 📁 Project Structure

```
piik.me/
├── public/
│   ├── assets/           # Static assets (images, logos)
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript modules
│   │   ├── app.js        # Main application logic
│   │   ├── auth.js       # Authentication module
│   │   ├── qr-generator.js # QR code module
│   │   └── firebase-config.js # Firebase SDK config
│   ├── index. html        # Main dashboard
│   ├── bio. html          # Bio link page template
│   └── countries.geojson # Geographic data for visualizations
├── scripts/
│   ├── set-verified-badges.js # Admin script for verification
│   └── README.md         # Scripts documentation
├── server. js             # Express server & API routes
├── package.json          # Dependencies
├── vercel.json           # Vercel deployment config
├── ARCHITECTURE.md       # System architecture docs
├── CONTRIBUTING.md       # Contribution guidelines
└── README.md             # This file
```

---

## 🗄️ Data Architecture

piik.me uses Firebase Firestore for scalable, persistent data storage. 

### Database Collections

#### `links` Collection
```javascript
{
  originalUrl: string,      // Full destination URL
  shortCode: string,        // Unique identifier (e.g., "abc123")
  shortUrl: string,         // Complete short URL
  userId: string,           // Firebase Auth user ID
  userEmail: string,        // User's email address
  createdAt: timestamp,     // Server timestamp for proper sorting
  utmParams: {
    source:  string,
    medium: string,
    campaign: string,
    term: string,
    content: string
  }
}
```

#### `analytics` Collection
```javascript
{
  impressions: number,
  clicks: number,
  shares: number,
  clickHistory: [{
    timestamp: timestamp,
    device: string,       // "mobile" or "desktop"
    browser: string,
    referrer: string
  }],
  devices: { mobile: number, desktop: number },
  browsers: { chrome, firefox, safari, edge, other },
  referrers: { "example.com": number, "direct":  number }
}
```

#### `bioLinks` Collection
```javascript
{
  username: string,         // Unique username/slug
  displayName: string,      // Display name
  bio: string,              // Profile bio
  profilePicture: string,   // Profile image URL
  links: [{
    title: string,
    url: string,
    order: number
  }],
  backgroundStyle: string,  // Background theme
  verified: boolean,        // Verification status
  userId: string,
  createdAt: timestamp
}
```

---

## 🔌 API Reference

### Authentication

Protected endpoints require a Firebase Auth token: 
```http
Authorization: Bearer {firebase-auth-token}
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/shorten` | Create short link |
| `GET` | `/api/user/links` | Get user's links |
| `GET` | `/api/analytics/: shortCode` | Get analytics data |
| `POST` | `/api/track/impression/: shortCode` | Track impression |
| `POST` | `/api/track/share/:shortCode` | Track share |
| `GET` | `/: shortCode` | Redirect (auto-tracks click) |
| `POST` | `/api/github/bug` | Create GitHub issue |

### WebSocket Events (Socket.IO)

```javascript
socket.on('analyticsUpdate', (data) => {
  // { shortCode, impressions, clicks, shares, ...  }
});
```

---

## 🚢 Deployment

### Vercel (Recommended)

1. Install Vercel CLI: 
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard

The repository includes `vercel.json` for zero-config deployment.

### Production Checklist

- [ ] Update Firestore security rules
- [ ] Add production domain to Firebase authorized domains
- [ ] Configure all Firebase credentials as env variables
- [ ] Set `BASE_URL` to production domain
- [ ] Enable HTTPS/SSL
- [ ] Implement rate limiting
- [ ] Set up error logging (Sentry)
- [ ] Configure CDN for static assets

---

## 🔒 Security

### Implemented Features

- ✅ OAuth 2.0 via Google (Firebase Authentication)
- ✅ Server-side token verification
- ✅ User-specific data isolation
- ✅ Firestore security rules
- ✅ HTTPS enforcement (production)

### Recommended Additions

```javascript
// Rate Limiting
const rateLimit = require('express-rate-limit');
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Security Headers
const helmet = require('helmet');
app.use(helmet());
```

---

## 🤝 Contributing

We welcome contributions!  See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch:  `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m "Add amazing feature"`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Areas for Contribution

- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation
- 🎨 UI/UX enhancements
- ⚡ Performance optimizations
- 🌍 Internationalization (i18n)

---

## 📄 License

piik.me is open-source software licensed under the **MIT License**.

```
MIT License

Copyright (c) 2024-2025 piik.me

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software. 
```

---

## 🙏 Acknowledgments

Built with amazing open-source technologies: 

- [Firebase](https://firebase.google.com) - Backend infrastructure
- [Express. js](https://expressjs.com) - Web framework
- [Socket.IO](https://socket.io) - Real-time communication
- [Three.js](https://threejs.org) - 3D graphics
- [Globe.gl](https://globe.gl) - Globe visualizations

---

<div align="center">

**[⭐ Star this repo](https://github.com/xthxr/piik.me)** if you find it useful!

Made with ❤️ by [xthxr](https://github.com/xthxr)

</div>
