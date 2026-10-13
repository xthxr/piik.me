# Environment Setup Guide

## Overview

This project relies on several external services, including Firebase, Upstash Redis, and GitHub integration. Proper configuration of environment variables is required before running the application locally or deploying it.

---

## Prerequisites

Before starting, ensure you have:

* Node.js installed
* npm installed
* A Firebase project
* An Upstash Redis database
* A GitHub Personal Access Token (for bug reporting features)

---

## Step 1: Create Your Environment File

Copy the example configuration file:

```bash
cp .env.example .env.local
```

Open `.env.local` and replace all placeholder values with your actual credentials.

---

## Step 2: Configure Firebase

### Create a Firebase Project

1. Visit Firebase Console.
2. Create a new project.
3. Enable the required Firebase services.

### Firebase Admin SDK Variables

Obtain these values from:

Firebase Console → Project Settings → Service Accounts

Required variables:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

### Firebase Web App Variables

From:

Firebase Console → Project Settings → General → Your Apps

Configure:

```env
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
```

---

## Step 3: Configure GitHub Integration

Create a GitHub Personal Access Token.

Steps:

1. Open GitHub Settings
2. Navigate to Developer Settings
3. Select Personal Access Tokens
4. Generate a new token

Required permission:

```text
repo
```

Configure:

```env
GITHUB_TOKEN=
```

---

## Step 4: Configure Upstash Redis

### Create Database

1. Create an Upstash account
2. Create a Redis database
3. Open the database dashboard

Copy:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

These values are used for:

* Edge redirects
* Rate limiting
* Caching

---

## Step 5: Configure Server Settings

Local development:

```env
PORT=3000
BASE_URL=http://localhost:3000
```

Adjust if running on a different port.

---

## Step 6: Verify Configuration

Install dependencies:

```bash
npm install
```

Start the application:

```bash
npm run dev
```

If configuration is correct, the server should start without environment validation errors.

---

## Common Configuration Errors

### Missing Environment Variable

Error:

```text
Missing required environment variable
```

Solution:

* Verify all required variables exist in `.env.local`
* Ensure there are no spelling mistakes

---

### Invalid Firebase Credentials

Symptoms:

* Authentication failures
* Firebase initialization errors

Solution:

* Verify project credentials
* Check Admin SDK values
* Confirm private key formatting

---

### Invalid Session Secret

Symptoms:

* Login/session failures

Solution:

* Generate a new secret using:

```bash
openssl rand -hex 32
```

* Ensure it is at least 32 characters long

---

### Redis Connection Errors

Symptoms:

* Rate limiting failures
* Redis connection exceptions

Solution:

* Verify REST URL
* Verify REST Token
* Confirm database is active

---

## Security Best Practices

* Never commit `.env.local`
* Rotate secrets periodically
* Use different credentials for development and production
* Restrict access to service accounts
* Store production secrets securely

---

## Additional Resources

* `.env.example`
* `docs/FIREBASE_SETUP.md`
* Project README
