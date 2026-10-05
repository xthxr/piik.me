import js from "@eslint/js";
import globals from "globals";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Global ignores — skip vendor/minified files
  { ignores: ["node_modules/", "public/js/vendor/"] },

  // Apply ESLint recommended rules as base
  js.configs.recommended,

  // ── Backend: Node.js CommonJS ──────────────────────────────────
  {
    files: [
      "server.js",
      "jest.config.js",
      "config/**/*.js",
      "scripts/**/*.js",
      "src/**/*.js",
      "public/api/**/*.js"
    ],
    languageOptions: {
      globals: { ...globals.node, ...globals.commonjs },
      ecmaVersion: "latest"
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      semi: ["warn", "always"],
      "no-console": "off",
      "no-empty": "warn",
      "prefer-const": "warn",
      "no-var": "warn"
    }
  },

  // ── Test Files (Jest) ─────────────────────────────────────────
  {
    files: [
      "src/**/__tests__/**/*.js",
      "tests/**/*.js",
      "**/*.test.js",
      "**/*.spec.js"
    ],
    languageOptions: {
      globals: { ...globals.node, ...globals.commonjs, ...globals.jest },
      ecmaVersion: "latest"
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      semi: ["warn", "always"],
      "no-console": "off",
      "no-empty": "warn",
      "prefer-const": "warn",
      "no-var": "warn"
    }
  },

  // ── Vercel/Next.js middleware (ESM) ───────────────────────────
  {
    files: ["middleware.js"],
    languageOptions: {
      globals: { ...globals.node },
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      semi: ["warn", "always"],
      "no-console": "off",
      "no-empty": "warn",
      "prefer-const": "warn",
      "no-var": "warn"
    }
  },

  // ── Frontend: Browser JS ──────────────────────────────────────
  {
    files: ["public/js/*.js"],
    ignores: [
      "public/js/vendor/**",
      "public/js/github-stars.js",
      "public/js/globe-worker.js"
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        // CDN / vendor globals
        firebase: "readonly",
        Chart: "readonly",
        QRCode: "readonly",
        Globe: "readonly",
        DomPurify: "readonly",
        io: "readonly",
        QRCodeStyling: "readonly",
        THREE: "readonly",
        d3: "readonly",
        // Cross-file shared globals (declared in other JS files)
        getAuthToken: "readonly",
        showToast: "readonly",
        apiCall: "readonly",
        QRGenerator: "readonly",
        auth: "readonly",
        googleProvider: "readonly",
        showDashboard: "readonly",
        allGeoClicks: "readonly",
        currentUser: "writable",
        userLinks: "readonly",
        initBioLink: "readonly",
        logoutBtn: "readonly",
        verifyUserBeforeAction: "readonly",
        currentGeoView: "readonly",
        updateGlobeData: "readonly"
      },
      ecmaVersion: "latest"
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      semi: ["warn", "always"],
      "no-console": "off",
      "no-empty": "warn",
      "prefer-const": "warn",
      "no-var": "warn"
    }
  },

  // ── Web Worker (globe-worker.js) ──────────────────────────────
  {
    files: ["public/js/globe-worker.js"],
    languageOptions: {
      globals: {
        ...globals.worker,
        THREE: "readonly"
      },
      ecmaVersion: "latest"
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      semi: ["warn", "always"],
      "no-console": "off",
      "no-empty": "warn",
      "prefer-const": "warn",
      "no-var": "warn"
    }
  },

  // ── github-stars.js (dual browser + Node) ─────────────────────
  {
    files: ["public/js/github-stars.js"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      ecmaVersion: "latest"
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      semi: ["warn", "always"],
      "no-console": "off",
      "no-empty": "warn",
      "prefer-const": "warn",
      "no-var": "warn"
    }
  }
];
