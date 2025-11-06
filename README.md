# ⚡ Zaplink - Real-time UTM Link Generator & Analytics

A powerful URL shortener with real-time analytics tracking and Google Authentication. Create short links, add UTM parameters, and monitor impressions, clicks, and shares with extremely low latency updates. All data is stored in Firebase Firestore for persistence.

## Features

✨ **URL Shortening** - Generate short, memorable links instantly  
� **Google Authentication** - Secure login with Firebase Auth  
�📊 **Real-time Analytics** - Track impressions, clicks, and shares with WebSocket updates  
💾 **Persistent Storage** - All data stored in Firebase Firestore  
👤 **User Dashboard** - View and manage all your links in one place  
🎯 **UTM Parameters** - Add marketing campaign parameters to your links  
📱 **Device Tracking** - See which devices (mobile/desktop) click your links  
🌐 **Browser Analytics** - Track which browsers are being used  
🔗 **Referrer Tracking** - Know where your clicks are coming from  
📈 **Click-Through Rate** - Automatic CTR calculation  
⚡ **Extremely Low Latency** - Real-time updates via Socket.IO

## Installation

### 1. Install dependencies:
```bash
npm install
```

### 2. Set up Firebase:

Follow the detailed instructions in [FIREBASE_SETUP.md](FIREBASE_SETUP.md) to:
- Create a Firebase project
- Enable Google Authentication
- Create a Firestore database
- Get your configuration credentials

### 3. Configure environment variables:

Update the `.env` file with your Firebase credentials:
```env
PORT=3000
BASE_URL=http://localhost:3000

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Also update `public/firebase-config.js` with your web app configuration.

### 4. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

### 5. Open your browser:
Navigate to `http://localhost:3000`

## Usage

### 1. Sign In
- Click "Sign in with Google"
- Authorize with your Google account
- You'll be redirected to your dashboard

### 2. Create a Link
- Click "+ Create New Link" or "Create Your First Link"
- Enter your long URL
- (Optional) Add UTM parameters for campaign tracking:
  - **Source**: Where the traffic comes from (e.g., google, newsletter)
  - **Medium**: Marketing medium (e.g., email, cpc, banner)
  - **Campaign**: Campaign name (e.g., spring_sale)
  - **Term**: Keywords for paid search
  - **Content**: Differentiate ads or links
- Click "Generate Zaplink"

### 3. View Your Dashboard
- See all your created links
- Quick stats for each link (impressions, clicks, shares, CTR)
- Copy or share links directly from the dashboard

### 4. View Real-time Analytics
- Click "📊 View Analytics" on any link
- Watch live updates as people click your link!
- See detailed breakdowns:
  - Device types (Mobile/Desktop)
  - Browser statistics
  - Top referrers
  - Recent click history with timestamps

### 5. Share Links
- Click the "🔗 Share" button
- Use native share on mobile devices
- Copy to clipboard on desktop
- Share metrics are automatically tracked

## Data Persistence

All data is stored in Firebase Firestore:
- **links** collection: Stores link information (URL, short code, user ID, creation date, UTM params)
- **analytics** collection: Stores analytics data (impressions, clicks, shares, click history, device/browser stats)
- **users** collection: User profile information (auto-created by Firebase Auth)

Your links and analytics persist across sessions and browser restarts!

## API Endpoints

### Create Short Link
```
POST /api/shorten
Body: {
  "url": "https://example.com",
  "utmParams": {
    "source": "google",
    "medium": "cpc",
    "campaign": "summer_sale"
  }
}
```

### Get Analytics
```
GET /api/analytics/:shortCode
```

### Track Impression
```
POST /api/track/impression/:shortCode
```

### Track Share
```
POST /api/track/share/:shortCode
```

### Redirect (automatically tracks click)
```
GET /:shortCode
```

## Technologies Used

- **Backend**: Node.js, Express.js
- **Real-time**: Socket.IO for live analytics updates
- **Authentication**: Firebase Authentication (Google Sign-In)
- **Database**: Firebase Firestore (NoSQL)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Short Code Generation**: nanoid
- **Session Management**: Firebase Auth tokens

## Architecture

### Backend (`server.js`)
- Express server with Socket.IO for real-time updates
- Firebase Admin SDK for server-side operations
- JWT token verification for protected routes
- RESTful API endpoints for CRUD operations

### Frontend
- `index.html` - Main UI structure
- `styles.css` - Modern, responsive design with animations
- `firebase-config.js` - Firebase client configuration
- `auth.js` - Authentication state management
- `app.js` - Main application logic and dashboard

### Firebase Collections

**links** (shortCode as document ID):
```javascript
{
  originalUrl: string,
  shortCode: string,
  shortUrl: string,
  userId: string,
  userEmail: string,
  createdAt: timestamp,
  utmParams: object
}
```

**analytics** (shortCode as document ID):
```javascript
{
  impressions: number,
  clicks: number,
  shares: number,
  clickHistory: array,
  devices: object,
  browsers: object,
  referrers: object
}
```

## Deployment

For production deployment:

### 1. Firebase Configuration
- Set up Firebase project in production mode
- Update Firestore security rules (see FIREBASE_SETUP.md)
- Add production domain to authorized domains

### 2. Environment Variables
- Update `BASE_URL` to your production domain
- Ensure all Firebase credentials are correct
- Never commit `.env` file to version control

### 3. Hosting Options
- **Heroku**: Easy deployment with Git
- **DigitalOcean App Platform**: Node.js support
- **Google Cloud Run**: Containerized deployment
- **AWS EC2/Elastic Beanstalk**: Scalable infrastructure
- **Render/Railway**: Modern hosting platforms

### 4. Production Checklist
- [ ] Set Firestore security rules
- [ ] Enable Firebase Authentication for production
- [ ] Add production domain to Firebase authorized domains
- [ ] Set up SSL/HTTPS
- [ ] Configure environment variables
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy for Firestore

## Customization

### Firestore Security Rules

The application includes comprehensive security rules to protect user data. Update them in Firebase Console as needed for your use case.

### Custom Short Codes

Modify the `generateShortCode()` function in `server.js`:
```javascript
function generateShortCode() {
  return nanoid(7); // Change length or use custom logic
}
```

### Analytics Enhancements

Add more tracking features:
- Geographic location (IP geolocation with GeoIP services)
- Time-based analytics (hourly/daily trends)
- A/B testing capabilities
- Custom event tracking
- Export analytics to CSV/PDF
- Email reports

### UI Customization

Modify `styles.css` to match your brand:
- Change color scheme (update CSS variables)
- Customize animations
- Add your logo to the header
- Modify card layouts

## API Reference

### Create Short Link
```http
POST /api/shorten
Authorization: Bearer {firebase-token}
Content-Type: application/json

{
  "url": "https://example.com",
  "utmParams": {
    "source": "google",
    "medium": "cpc",
    "campaign": "summer_sale"
  }
}
```

### Get User's Links
```http
GET /api/user/links
Authorization: Bearer {firebase-token}
```

### Get Analytics for Link
```http
GET /api/analytics/:shortCode
```

### Track Impression
```http
POST /api/track/impression/:shortCode
```

### Track Share
```http
POST /api/track/share/:shortCode
```

### Redirect (tracks click automatically)
```http
GET /:shortCode
```

## Troubleshooting

### Firebase Authentication Issues
- **"Popup blocked"**: Allow popups for localhost in browser settings
- **"Unauthorized domain"**: Add `localhost` to authorized domains in Firebase Console
- **"Invalid token"**: Token may have expired, sign out and sign in again

### Firestore Permission Errors
- Check security rules in Firebase Console
- Ensure user is authenticated before making requests
- Verify token is being sent in Authorization header

### Real-time Updates Not Working
- Check browser console for Socket.IO connection errors
- Ensure WebSocket connections are not blocked by firewall
- Verify server is running and accessible

## Security Considerations

✅ **Implemented**:
- Firebase Authentication with Google OAuth
- Server-side token verification
- Firestore security rules
- Protected API endpoints

📋 **Recommended for Production**:
- Rate limiting (e.g., express-rate-limit)
- URL validation and blacklist
- HTTPS/SSL enforcement
- CORS configuration
- Malicious URL detection
- DDoS protection
- Input sanitization
- Regular security audits

## Performance Optimization

- Use Firestore compound indexes for complex queries
- Implement caching for frequently accessed links
- Use CDN for static assets
- Enable compression middleware
- Optimize Socket.IO connection handling
- Consider Redis for session storage
- Implement pagination for large datasets

## License

MIT License - Feel free to use and modify!

## Support

For issues or questions, please open an issue on GitHub.

---

Made with ⚡ by Zaplink
