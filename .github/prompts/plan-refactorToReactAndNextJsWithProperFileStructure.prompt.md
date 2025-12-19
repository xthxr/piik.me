## Plan: Refactor to React and Next.js with Proper File Structure

Migrate the vanilla JS/Express app to a React/Next.js architecture with TypeScript and App Router for better maintainability, SEO, and performance. Convert static HTML/JS to dynamic React components using TSX, replace Express routes with Next.js API routes, and adopt a modular file structure (app/, components/, styles/, lib/, api/). Use GSAP for animations, Tailwind CSS for styling, and ensure proper library usage (e.g., TanStack Query for data fetching, Zustand for state management, Next.js Image/Font for optimization). Implement SEO with metadata API, error boundaries, and testing. This preserves all features like analytics, QR generation, bio links, and real-time updates while improving scalability.

### Steps
1. Initialize Next.js project with React, TypeScript, and App Router; install dependencies (Firebase, Socket.io, Three.js, GSAP, TanStack Query, Zustand, Tailwind CSS, etc.); set up ESLint, Prettier, and testing (Jest + React Testing Library); create basic structure (app/, components/, styles/, lib/, api/).
2. Convert HTML pages (index.html, bio.html) to TSX in app/ directory, migrating vanilla JS logic to React components and hooks with TypeScript types; use Next.js metadata API for SEO.
3. Port Express server routes to Next.js API routes (/api/*), handling authentication, Firestore queries, and redirects; implement ISR for static bio links.
4. Implement authentication with Firebase Auth in React, using contexts and hooks for state management across protected routes.
5. Extract reusable UI elements (charts, modals, globe) into components/, integrate real-time updates via Socket.io, style with Tailwind CSS, and implement animations with GSAP; use Next.js Image and Font components.
6. Add error boundaries, loading states, and PWA features; test functionality with automated tests; optimize performance (e.g., lazy loading, code splitting); deploy to Vercel, ensuring feature parity.

1. Prioritize core features (URL shortening, analytics) before advanced ones (3D globe, bio links) to minimize downtime.
2. Address real-time and 3D rendering challenges by using client-side rendering and performance optimizations.
3. Use TypeScript/TSX throughout for type safety and better developer experience; leverage server components for static content.

### Migration Commands & Steps

**Phase 1: Project Setup**

1. **Backup current project:**
   ```bash
   # Create a new branch for migration
   git checkout -b nextjs-migration
   ```

2. **Initialize Next.js with TypeScript and App Router:**
   ```bash
   npx create-next-app@latest piik-next --typescript --tailwind --app --src-dir --import-alias "@/*"
   cd piik-next
   ```

3. **Install core dependencies:**
   ```bash
   npm install firebase firebase-admin socket.io-client three@^0.181.2 globe.gl@^2.45.0 d3-scale@^4.0.2 d3-scale-chromatic@^3.1.0 nanoid@^3.3.7 qrcode@^1.5.4
   ```

4. **Install UI and animation libraries:**
   ```bash
   npm install gsap @tanstack/react-query zustand @headlessui/react @heroicons/react framer-motion recharts
   ```

5. **Install development tools:**
   ```bash
   npm install --save-dev @types/node @types/react @types/three @types/qrcode eslint prettier eslint-config-prettier jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
   ```

6. **Add PWA and utility dependencies:**
   ```bash
   npm install next-pwa clsx tailwind-merge class-variance-authority
   ```

**Phase 2: File Migration**

7. **Migrate static assets:**
   ```bash
   # Copy assets from old project
   cp -r ../piik.me/public/assets ./public/
   cp ../piik.me/public/countries.geojson ./public/
   ```

8. **Create new directory structure:**
   ```bash
   mkdir -p src/components/{ui,layout,analytics,qr,bio,modals}
   mkdir -p src/lib/{firebase,utils,hooks,api}
   mkdir -p src/app/api/{shorten,analytics,user,links,track}
   mkdir -p src/contexts
   mkdir -p src/types
   ```

**Phase 3: Configuration**

9. **Set up environment variables:**
   ```bash
   # Create .env.local with Next.js naming
   cat > .env.local << EOL
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   FIREBASE_PRIVATE_KEY=your_private_key
   FIREBASE_CLIENT_EMAIL=your_client_email
   GITHUB_TOKEN=your_github_token
   EOL
   ```

10. **Configure next.config.js:**
    ```javascript
    // Add support for Socket.io, PWA, and custom webpack config for Three.js
    ```

11. **Update TypeScript configuration:**
    ```json
    // Enable strict mode, paths, and proper module resolution
    ```

12. **Configure Tailwind CSS:**
    ```bash
    # Update tailwind.config.js with custom colors and animations
    ```

**Phase 4: Code Migration Priorities**

13. **Priority modules to convert:**
    - Firebase config → `src/lib/firebase/config.ts`
    - Auth logic (2886 lines in app.js) → React components + hooks
    - Socket.io client setup → `src/lib/socket.ts`
    - Bio links (1708 lines) → `src/app/[username]/page.tsx`
    - QR generator → `src/components/qr/QRGenerator.tsx`
    - Globe visualization → `src/components/analytics/GlobeView.tsx`

14. **API routes to port (from server.js - 1200+ lines):**
    - `/api/shorten` → `src/app/api/shorten/route.ts`
    - `/api/analytics/:shortCode` → `src/app/api/analytics/[shortCode]/route.ts`
    - `/api/user/*` → `src/app/api/user/*/route.ts`
    - `/:shortCode` redirect → `src/app/[shortCode]/page.tsx` (with server-side redirect)
    - `/:username/:slug` → `src/app/[username]/[slug]/page.tsx`

**Phase 5: Testing & Deployment**

15. **Configure Vercel deployment:**
    ```bash
    # Update vercel.json for Next.js or remove (Next.js auto-configures)
    ```

16. **Run migration validation:**
    ```bash
    npm run build
    npm run lint
    npm run test
    ```

**Key Migration Challenges Identified:**
- Server.js is 1200+ lines with complex redirect logic and real-time analytics
- App.js is 2886+ lines of vanilla JS requiring careful component extraction
- Socket.io server needs migration to Next.js API route or external service
- Globe.gl and Three.js need client-side only rendering (use 'use client' directive)
- Bio link CSS animations (4185 lines) need GSAP conversion
- Firestore security rules need updating for new architecture
