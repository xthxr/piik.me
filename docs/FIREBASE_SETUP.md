# Firebase Setup Guide

This guide will help you set up Firebase for the Zaplink application.

## Prerequisites

- A Google account
- Node.js installed on your machine

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter your project name
4. Follow the setup wizard

## Step 2: Enable Firestore Database

1. In your Firebase project, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development
4. Select a location for your database

## Step 3: Enable Authentication

1. Go to "Authentication" in the Firebase console
2. Click "Get started"
3. Enable the sign-in methods you want to use:
   - Email/Password
   - Google
   - GitHub
   - etc.

## Step 4: Get Your Service Account Key

1. Go to Project Settings (gear icon) > Service Accounts
2. Click "Generate new private key"
3. Save the JSON file securely

## Step 5: Configure Environment Variables

1. Copy `.env.example` to `.env`
2. Open the downloaded JSON file from Step 4
3. Fill in the following values in your `.env` file:
   - `FIREBASE_PROJECT_ID`: The `project_id` from the JSON
   - `FIREBASE_CLIENT_EMAIL`: The `client_email` from the JSON
   - `FIREBASE_PRIVATE_KEY`: The `private_key` from the JSON (keep the quotes and newlines)

Example:
```env
FIREBASE_PROJECT_ID=my-project-12345
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@my-project-12345.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n"
```

## Step 6: Set Up Firebase in Your Client Application

1. Go to Project Settings > General
2. Scroll down to "Your apps"
3. Click the web icon (</>)
4. Register your app
5. Copy the Firebase config object
6. Update `public/js/firebase-config.js` with your config

## Step 7: Set Firestore Security Rules

In the Firestore Database section, update your security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Links collection
    match /links/{linkId} {
      allow read: if true;
      allow write: if request.auth != null;
      allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Analytics collection
    match /analytics/{analyticsId} {
      allow read: if request.auth != null;
      allow write: if true;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Troubleshooting

### Error: "Firebase Admin not configured"

Make sure your `.env` file exists and contains valid credentials.

### Error: "Invalid private key"

Ensure the private key in your `.env` file:
- Is wrapped in quotes
- Contains `\\n` for newlines (not actual newlines)
- Starts with `-----BEGIN PRIVATE KEY-----`
- Ends with `-----END PRIVATE KEY-----`

### Connection Issues

- Check that your Firebase project is active
- Verify your service account has the correct permissions
- Ensure Firestore is enabled in your project

## Next Steps

After completing the setup:
1. Run `npm install` to install dependencies
2. Run `npm start` to start the server
3. Visit `http://localhost:3000` to use the application

For more information, see the [Firebase Documentation](https://firebase.google.com/docs).
